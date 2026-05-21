/**
 * AI Fitting API — Phase 4
 * POST /api/generate/ai-fitting
 *
 * 사용자가 업로드한 모델 사진에 원본 제품을 자연스럽게 입혀준 합성 이미지를 생성.
 *
 * 흐름:
 *  1. 인증 + 크레딧 가드 (Pro 이상 + 5크레딧)
 *  2. 모델 이미지를 Supabase Storage 의 ai-fittings/ 폴더에 업로드 (재사용 위해)
 *  3. user_profiles.last_model_image_url 갱신 (다음 fitting 시 재사용 옵션)
 *  4. Nano Banana 2 multi-reference 호출 [제품, 모델]
 *  5. ai_fittings 테이블 기록 + usage_events 기록 + 크레딧 차감
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { checkCreditGuard, deductCredits } from '@/lib/credit-guard'
import { buildAiFittingPrompt } from '@/lib/prompts/image/ai-fitting'
import { NanaBanana2Provider } from '@/lib/ai/image/nano-banana2-provider'
import { setImageProvider, getImageProvider } from '@/lib/ai/client'
import type { AspectRatio, Resolution } from '@/lib/ai/image/types'

// Node Runtime — Storage 업로드 + Google SDK
export const maxDuration = 90

// ─── 스키마 ─────────────────────────────────────────────────────────────────

const FittingSchema = z.object({
  projectId: z.string().uuid(),
  /** 원본 제품 이미지 (이미 store 에 있음. URL 또는 base64) */
  productImageUrl: z.string().url().optional(),
  productImageBase64: z.string().optional(),
  /** 모델 이미지 — 처음 업로드: base64. 재사용: URL (last_model_image_url) */
  modelImageUrl: z.string().url().optional(),
  modelImageBase64: z.string().optional(),
  /** D-2: 3장 (1:1, 4:5, 9:16) 기본 */
  aspectRatios: z
    .array(z.enum(['1:1', '4:5', '9:16', '16:9', '4:3', '3:4']))
    .default(['1:1', '4:5', '9:16']),
  resolution: z.enum(['1K', '2K', '4K']).default('2K'),
  /** 분석 결과 일부 (큐레이션 prompt 강화용) */
  category: z.string().default('패션 아이템'),
  productKeyFeatures: z.array(z.string()).default([]),
  /** 자연어 보정 지시 */
  refinement: z.string().max(300).optional(),
  /** 마지막 모델 이미지 자동 저장 여부 — 사용자가 명시적으로 새 모델 사용 시 false */
  saveAsLastModel: z.boolean().default(true),
})

// ─── 핸들러 ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // ── 인증 ──────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    // ── 입력 파싱 ─────────────────────────────────────────────────────────
    const body = await request.json()
    const parsed = FittingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const {
      projectId, productImageUrl, productImageBase64,
      modelImageUrl, modelImageBase64,
      aspectRatios, resolution,
      category, productKeyFeatures,
      refinement, saveAsLastModel,
    } = parsed.data

    // 제품/모델 이미지 모두 있어야 함
    const productImage = productImageBase64 ?? productImageUrl
    const modelImage = modelImageBase64 ?? modelImageUrl
    if (!productImage) return NextResponse.json({ error: '제품 이미지가 필요합니다.' }, { status: 400 })
    if (!modelImage)   return NextResponse.json({ error: '모델 이미지가 필요합니다.' }, { status: 400 })

    // ── 크레딧 가드 (5 크레딧 + Pro 이상) ─────────────────────────────────
    const guard = await checkCreditGuard({
      userId: user.id,
      operation: 'studio_fitting',
      resolution: resolution as Resolution,
    })
    if (!guard.allowed) {
      return NextResponse.json(
        { error: guard.reason, upgradeUrl: guard.upgradeUrl, guardResult: guard },
        { status: 402 }
      )
    }

    // ── 모델 이미지를 Storage 에 업로드 (base64 일 때만) ─────────────────
    // 이미 URL 인 경우 재사용이므로 다시 업로드 안 함.
    let persistedModelUrl: string | null = modelImageUrl ?? null
    if (modelImageBase64 && !modelImageUrl) {
      try {
        const admin = await createAdminClient()
        const matchType = modelImageBase64.match(/^data:(image\/[a-z]+);base64,/)
        const mimeType = matchType?.[1] ?? 'image/jpeg'
        const ext = mimeType.split('/')[1] ?? 'jpg'
        const data = modelImageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
        const buf = Buffer.from(data, 'base64')
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadErr } = await admin.storage
          .from('ai-fittings')
          .upload(path, buf, { contentType: mimeType, upsert: false })
        if (uploadErr) {
          console.warn('[ai-fitting] model upload failed (storage may not exist yet):', uploadErr.message)
          // 업로드 실패해도 생성은 진행 (URL 만 비어있게 됨)
        } else {
          const { data: pub } = admin.storage.from('ai-fittings').getPublicUrl(path)
          persistedModelUrl = pub.publicUrl
          // user_profiles.last_model_image_url 갱신
          if (saveAsLastModel) {
            await admin
              .from('user_profiles')
              .update({ last_model_image_url: persistedModelUrl })
              .eq('id', user.id)
          }
        }
      } catch (storageErr) {
        console.warn('[ai-fitting] storage step failed:', storageErr)
        // graceful: storage 실패해도 생성은 진행
      }
    }

    // ── 이미지 프로바이더 초기화 ──────────────────────────────────────────
    try {
      getImageProvider()
    } catch {
      setImageProvider(new NanaBanana2Provider())
    }
    const provider = getImageProvider()

    // ── multi-reference 호출 [제품, 모델] ─────────────────────────────────
    const referenceImages = [productImage, modelImage]

    // 비율별 병렬 생성 — 각 비율마다 prompt 조정
    // 단일 generate() 호출이 내부적으로 비율을 병렬 처리하지만 prompt 가 비율별로 달라야
    // 더 좋은 구도가 나오므로 여기서는 첫 비율의 prompt 를 사용 (provider 가 비율 정보를 활용함)
    const prompt = buildAiFittingPrompt({
      category,
      productKeyFeatures,
      aspectRatio: aspectRatios[0] as AspectRatio,
      refinement,
    })

    const genResult = await provider.generate({
      referenceImages,
      prompt,
      aspectRatios: aspectRatios as AspectRatio[],
      count: 1,
      resolution: resolution as Resolution,
    })

    if (genResult.images.length === 0) {
      throw new Error('Nano Banana 2 가 결과 이미지를 반환하지 않았습니다.')
    }

    // ── DB 기록 (ai_fittings) ─────────────────────────────────────────────
    const inserts = genResult.images.map((img) => ({
      project_id: projectId,
      model_image_url: persistedModelUrl,
      result_url: img.url,
      aspect_ratio: img.aspectRatio,
      width: img.width,
      height: img.height,
      prompt,
    }))

    const { data: saved } = await supabase
      .from('ai_fittings')
      .insert(inserts)
      .select('id, result_url, aspect_ratio, width, height, model_image_url')

    // ── usage_events + 크레딧 차감 ────────────────────────────────────────
    await Promise.all([
      supabase.from('usage_events').insert({
        user_id: user.id,
        project_id: projectId,
        event_type: 'ai_fitting_generated',
        credits_used: 5,
        metadata: {
          count: genResult.images.length,
          aspectRatios,
          resolution,
          elapsedMs: Date.now() - startTime,
          requestId: genResult.requestId,
        },
      }),
      deductCredits({ userId: user.id, operation: 'studio_fitting' }),
    ])

    const elapsed = Date.now() - startTime
    console.log(`[ai-fitting] Generated ${genResult.images.length} fittings in ${elapsed}ms`)

    return NextResponse.json({
      fittings: saved ?? inserts,
      modelImageUrl: persistedModelUrl,
      projectId,
      elapsedMs: elapsed,
    })
  } catch (err) {
    console.error('[/api/generate/ai-fitting]', err)
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    let userMessage = `AI Fitting 실패: ${message}`
    if (/credit_balance|credits.*low|insufficient/i.test(message)) {
      userMessage = 'AI API 크레딧이 부족합니다. https://console.anthropic.com/settings/billing 또는 Google AI Studio 잔액을 확인해주세요.'
    } else if (/quota|rate.?limit/i.test(message)) {
      userMessage = 'Google AI API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.'
    }
    return NextResponse.json({ error: userMessage, debug: message }, { status: 500 })
  }
}
