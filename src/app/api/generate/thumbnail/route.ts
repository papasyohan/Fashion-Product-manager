/**
 * 썸네일 생성 API (Sprint 2 — Studio Mode 전용)
 * POST /api/generate/thumbnail
 *
 * 흐름:
 *  1. 인증 확인 + 크레딧 가드 (3크레딧 필요)
 *  2. 이미지 분석 결과로 5계층 프롬프트 조립
 *  3. NanaBanana2Provider로 다중 종횡비 병렬 생성
 *  4. Supabase Storage 저장 + thumbnails 테이블 기록
 *  5. usage_events 기록 + 크레딧 차감
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkCreditGuard, deductCredits } from '@/lib/credit-guard'
import { buildImagePrompt, buildPromptLayers } from '@/lib/ai/image/prompt-builder'
import { NanaBanana2Provider } from '@/lib/ai/image/nano-banana2-provider'
import { setImageProvider, getImageProvider } from '@/lib/ai/client'
import type { AspectRatio, Resolution } from '@/lib/ai/image/types'

// ─── 스키마 ─────────────────────────────────────────────────────────────────

const ThumbnailSchema = z.object({
  projectId: z.string().uuid(),
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional(),
  /** 분석 결과 — pipeline에서 받아옴 */
  analysis: z.object({
    category: z.string(),
    colors: z.array(z.string()),
    style: z.string(),
    mood: z.string(),
    keyFeatures: z.array(z.string()),
    keywords: z.array(z.string()),
  }),
  aspectRatios: z
    .array(z.enum(['1:1', '4:5', '5:4', '3:4', '4:3', '9:16', '16:9', '21:9', '1:4', '4:1', '1:8', '8:1']))
    .default(['1:1', '4:5', '9:16', '16:9']),
  count: z.number().min(1).max(4).default(1),
  resolution: z.enum(['1K', '2K', '4K']).default('2K'),
  overlayText: z.string().max(20).optional(),
})

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // ─── 인증 ─────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    // ─── 요청 파싱 ────────────────────────────────────────────────────────
    const body = await request.json()
    const parsed = ThumbnailSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { projectId, imageUrl, imageBase64, analysis, aspectRatios, count, resolution, overlayText } = parsed.data

    // ─── 크레딧 가드 ──────────────────────────────────────────────────────
    const guard = await checkCreditGuard({
      userId: user.id,
      operation: 'studio_thumbnail',
      resolution: resolution as Resolution,
    })

    if (!guard.allowed) {
      return NextResponse.json(
        { error: guard.reason, upgradeUrl: guard.upgradeUrl, guardResult: guard },
        { status: 402 }
      )
    }

    // ─── 이미지 프로바이더 초기화 ─────────────────────────────────────────
    try {
      getImageProvider()
    } catch {
      setImageProvider(new NanaBanana2Provider())
    }

    const provider = getImageProvider()

    // ─── 5계층 프롬프트 조립 ──────────────────────────────────────────────
    const layers = buildPromptLayers({
      category: analysis.category,
      colors: analysis.colors,
      style: analysis.style,
      mood: analysis.mood,
      keyFeatures: analysis.keyFeatures,
      keywords: analysis.keywords,
      aspectRatio: aspectRatios[0] as AspectRatio,
      overlayText,
    })
    const prompt = buildImagePrompt(layers)

    // ─── 참조 이미지 준비 ─────────────────────────────────────────────────
    const referenceImages: string[] = []
    if (imageBase64) referenceImages.push(imageBase64)
    else if (imageUrl) referenceImages.push(imageUrl)

    if (referenceImages.length === 0) {
      return NextResponse.json({ error: '참조 이미지가 필요합니다.' }, { status: 400 })
    }

    // ─── 썸네일 생성 ─────────────────────────────────────────────────────
    const genResult = await provider.generate({
      referenceImages,
      prompt,
      aspectRatios: aspectRatios as AspectRatio[],
      count,
      resolution: resolution as Resolution,
    })

    // ─── DB 기록 ─────────────────────────────────────────────────────────
    const thumbnailInserts = genResult.images.map((img) => ({
      project_id: projectId,
      url: img.url,
      width: img.width,
      height: img.height,
      aspect_ratio: img.aspectRatio,
      resolution,
      prompt,
    }))

    const { data: savedThumbnails } = await supabase
      .from('thumbnails')
      .insert(thumbnailInserts)
      .select('id, url, width, height, aspect_ratio')

    // ─── usage_events 기록 ────────────────────────────────────────────────
    await supabase.from('usage_events').insert({
      user_id: user.id,
      project_id: projectId,
      event_type: 'thumbnail_generated',
      credits_used: 3,
      metadata: {
        count: genResult.images.length,
        resolution,
        aspectRatios,
        elapsedMs: Date.now() - startTime,
        requestId: genResult.requestId,
      },
    })

    // ─── 크레딧 차감 ──────────────────────────────────────────────────────
    await deductCredits({ userId: user.id, operation: 'studio_thumbnail' })

    const elapsed = Date.now() - startTime
    console.log(`[thumbnail] Generated ${genResult.images.length} images in ${elapsed}ms`)

    return NextResponse.json({
      thumbnails: savedThumbnails ?? thumbnailInserts,
      prompt,
      layers,
      creditsAfter: guard.creditsAfter,
      requestId: genResult.requestId,
      elapsedMs: elapsed,
    })
  } catch (err) {
    console.error('[/api/generate/thumbnail]', err)
    const message = err instanceof Error ? err.message : '썸네일 생성 중 오류'

    // Google API 미결제 에러 처리
    if (message.includes('billing') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json(
        { error: 'Google GenAI 결제가 활성화되지 않았습니다. GCP 결제 수단을 연결해주세요.', code: 'BILLING_REQUIRED' },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
