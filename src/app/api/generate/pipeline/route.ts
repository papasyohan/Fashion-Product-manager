/**
 * 간편 모드 전체 파이프라인 API (I-01: ≤ 30초 목표)
 * analyze → naming + trends → tagline → description 순차 실행
 * POST /api/generate/pipeline
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { analyzeProductImage } from '@/lib/ai/analyzers/image-analyzer'
import { generateProductNames } from '@/lib/ai/generators/naming-agent'
import { generateTagline } from '@/lib/ai/generators/tagline-agent'
import { generateDescription } from '@/lib/ai/generators/description-agent'
import { fetchTrendKeywords } from '@/lib/trends/trend-fetcher'
import { checkCreditGuard, deductCredits } from '@/lib/credit-guard'

// Vercel 함수 타임아웃 60초 (Hobby 기본 10초 → 30초 목표 보장)
export const maxDuration = 60

const PipelineSchema = z.object({
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional(),
  mode: z.enum(['quick', 'studio']).default('quick'),
})

/** 단계별 실행 + 어느 단계에서 실패했는지 식별 가능한 에러 throw */
async function runStep<T>(stepName: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const e = new Error(`[${stepName}] ${message}`)
    // @ts-expect-error attach step name for downstream classification
    e.step = stepName
    throw e
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await request.json()
    const parsed = PipelineSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { imageUrl, imageBase64, mode } = parsed.data

    // ─── 크레딧 가드 ─────────────────────────────────────────────────────
    const operation = mode === 'studio' ? 'studio_text' : 'quick'
    const guard = await checkCreditGuard({ userId: user.id, operation })
    if (!guard.allowed) {
      return NextResponse.json(
        { error: guard.reason, upgradeUrl: guard.upgradeUrl, guardResult: guard },
        { status: 402 }
      )
    }

    // ─── 프로젝트 생성 ───────────────────────────────────────────────────
    const project = await runStep('project_create', async () => {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          mode,
          product_image_url: imageUrl ?? null,
          status: 'processing',
        })
        .select('id')
        .single()
      if (error || !data) {
        throw new Error(`projects insert failed: ${error?.message ?? 'no data'}`)
      }
      return data
    })

    const projectId = project.id

    // ─── Step 1: 이미지 분석 ────────────────────────────────────────────
    const analysis = await runStep('analyze', () =>
      analyzeProductImage({ imageUrl, imageBase64, mode })
    )

    await supabase.from('generations').insert({
      project_id: projectId,
      type: 'analyze',
      payload: analysis as unknown as Record<string, unknown>,
    })

    // ─── Step 2: 트렌드 키워드 + 상품명 병렬 ──────────────────────────
    const [{ keywords: trendKeywords }, namingResult] = await runStep(
      'naming_and_trends',
      () =>
        Promise.all([
          fetchTrendKeywords({ category: analysis.category }),
          generateProductNames({
            category: analysis.category,
            keywords: analysis.keywords,
            trendKeywords: [],
            style: analysis.style,
            platform: analysis.platform,
          }),
        ])
    )

    // 트렌드 반영 최종 상품명 (trendKeywords 포함 재생성은 생략 — 30초 내 완료 우선)
    await supabase.from('generations').insert({
      project_id: projectId,
      type: 'naming',
      payload: { ...namingResult, trendKeywords } as unknown as Record<string, unknown>,
    })

    // ─── Step 3: 홍보문구 (첫 번째 상품명 기준) ──────────────────────
    const primaryName = namingResult.names[0]?.name ?? analysis.category
    const taglineResult = await runStep('tagline', () =>
      generateTagline({
        productName: primaryName,
        category: analysis.category,
        keywords: analysis.keywords,
        mood: analysis.mood,
      })
    )

    await supabase.from('generations').insert({
      project_id: projectId,
      type: 'tagline',
      payload: taglineResult as unknown as Record<string, unknown>,
    })

    // ─── Step 4: 상세 설명 ────────────────────────────────────────────
    const descResult = await runStep('description', () =>
      generateDescription({
        productName: primaryName,
        tagline: taglineResult.tagline,
        category: analysis.category,
        keywords: analysis.keywords,
        mode,
        targetAudience: analysis.targetAudience,
      })
    )

    await supabase.from('generations').insert({
      project_id: projectId,
      type: 'description',
      payload: descResult as unknown as Record<string, unknown>,
    })

    // ─── 프로젝트 완료 ────────────────────────────────────────────────
    await supabase
      .from('projects')
      .update({ status: 'done', updated_at: new Date().toISOString() })
      .eq('id', projectId)

    // ─── 크레딧 차감 + 사용 이벤트 기록 ─────────────────────────────
    await Promise.all([
      deductCredits({ userId: user.id, operation }),
      supabase.from('usage_events').insert({
        user_id: user.id,
        project_id: projectId,
        event_type: mode === 'studio' ? 'studio_generated' : 'quick_generated',
        credits_used: guard.creditsRequired ?? 1,
        metadata: { mode, elapsedMs: Date.now() - startTime },
      }),
    ])

    const elapsed = Date.now() - startTime
    console.log(`[pipeline] ${mode} mode completed in ${elapsed}ms`)

    return NextResponse.json({
      projectId,
      analysis,
      names: namingResult.names,
      trendTags: namingResult.trendTags,
      tagline: taglineResult.tagline,
      description: descResult.description,
      highlights: descResult.highlights,
      elapsedMs: elapsed,
    })
  } catch (err) {
    const elapsed = Date.now() - startTime
    const message = err instanceof Error ? err.message : String(err)
    // @ts-expect-error step name is attached by runStep
    const step: string | undefined = err?.step

    console.error('[/api/generate/pipeline]', { step, message, elapsed })

    // 에러 분류 → 사용자 메시지
    let userMessage = `AI 생성 실패 (${step ?? 'unknown'}): ${message}`
    let status = 500

    if (/credit|credit_balance|insufficient/i.test(message)) {
      userMessage = 'Anthropic API 크레딧이 부족합니다. console.anthropic.com에서 충전해주세요.'
      status = 503
    } else if (/401|unauthorized|invalid.*api.*key|x-api-key/i.test(message)) {
      userMessage = 'Anthropic API 키가 유효하지 않습니다. 환경변수 확인이 필요합니다.'
      status = 503
    } else if (/timeout|aborted|FUNCTION_INVOCATION_TIMEOUT/i.test(message)) {
      userMessage = 'AI 응답이 너무 오래 걸립니다 (60초 초과). 잠시 후 재시도해주세요.'
      status = 504
    } else if (/JSON|parse/i.test(message) && step === 'analyze') {
      userMessage = 'AI 응답 파싱 실패. 다른 이미지로 재시도해주세요.'
    } else if (step === 'project_create') {
      userMessage = `DB 저장 실패: ${message}. 회원 프로필을 확인해주세요.`
    }

    return NextResponse.json(
      { error: userMessage, step, debug: message, elapsedMs: elapsed },
      { status }
    )
  }
}
