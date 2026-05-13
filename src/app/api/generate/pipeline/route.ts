/**
 * 텍스트 파이프라인 API — Edge Runtime + SSE 스트리밍
 *
 * 흐름:
 *   1. project_create
 *   2. analyze (vision)
 *   3. naming (병렬: trends + naming)
 *   4. tagline
 *   5. description (streamObject — 토큰 단위 SSE chunk)
 *   6. complete (크레딧 차감, project status update)
 *
 * 각 단계 결과/진행률은 SSE 이벤트로 즉시 클라이언트에 전달됩니다.
 * Edge Runtime 사용 → 10초 timeout 회피, 응답이 살아있는 한 무제한 스트림 유지.
 *
 * POST /api/generate/pipeline
 * Content-Type: text/event-stream
 */

import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { analyzeProductImage } from '@/lib/ai/analyzers/image-analyzer'
import { generateProductNames } from '@/lib/ai/generators/naming-agent'
import { generateTagline } from '@/lib/ai/generators/tagline-agent'
import { streamDescription } from '@/lib/ai/generators/description-agent'
import { fetchTrendKeywords } from '@/lib/trends/trend-fetcher'
import { checkCreditGuard, deductCredits } from '@/lib/credit-guard'
import type { PipelineEvent, PipelineStep } from '@/lib/ai/types'

// ─── 런타임 설정 ────────────────────────────────────────────────────────────

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// ─── 스키마 ─────────────────────────────────────────────────────────────────

const PipelineSchema = z.object({
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional(),
  mode: z.enum(['quick', 'studio']).default('quick'),
})

// ─── SSE 유틸 ───────────────────────────────────────────────────────────────

const encoder = new TextEncoder()

function sseEvent(event: PipelineEvent): Uint8Array {
  // Server-Sent Events 표준: `data: <JSON>\n\n`
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
}

// ─── 핵심 핸들러 ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  // ─── 사전 검증 (스트림 시작 전, 일반 JSON 응답으로 에러 처리) ───────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: '인증 필요' }, { status: 401 })
  }

  let parsed
  try {
    const body = await request.json()
    parsed = PipelineSchema.safeParse(body)
  } catch {
    return Response.json({ error: '잘못된 요청 본문' }, { status: 400 })
  }
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { imageUrl, imageBase64, mode } = parsed.data

  // 크레딧 가드 (DEV_BYPASS_CREDITS=true 면 자동 통과)
  const operation = mode === 'studio' ? 'studio_text' : 'quick'
  const guard = await checkCreditGuard({ userId: user.id, operation })
  if (!guard.allowed) {
    return Response.json(
      { error: guard.reason, upgradeUrl: guard.upgradeUrl, guardResult: guard },
      { status: 402 }
    )
  }

  // ─── 여기서부터 스트림 시작 ─────────────────────────────────────────────
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: PipelineEvent) => controller.enqueue(sseEvent(event))
      const fail = (step: PipelineStep | undefined, err: unknown, status = 500) => {
        const message = err instanceof Error ? err.message : String(err)
        emit({ type: 'error', message, step, status })
      }

      try {
        // ── Step 1: project_create ─────────────────────────────────────────
        emit({ type: 'progress', step: 'project_create', percent: 5 })
        const { data: project, error: projectErr } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            mode,
            product_image_url: imageUrl ?? null,
            status: 'processing',
          })
          .select('id')
          .single()
        if (projectErr || !project) {
          fail('project_create', projectErr ?? new Error('no project'), 500)
          return controller.close()
        }
        const projectId = project.id as string
        emit({ type: 'project', projectId })

        // ── Step 2: analyze ────────────────────────────────────────────────
        emit({ type: 'progress', step: 'analyze', percent: 25 })
        const analysis = await analyzeProductImage({ imageUrl, imageBase64, mode })
        emit({ type: 'analysis', data: analysis })
        await supabase.from('generations').insert({
          project_id: projectId,
          type: 'analyze',
          payload: analysis as unknown as Record<string, unknown>,
        })

        // ── Step 3: trends + naming (병렬) ─────────────────────────────────
        emit({ type: 'progress', step: 'naming', percent: 50 })
        const [{ keywords: trendKeywords }, namingResult] = await Promise.all([
          fetchTrendKeywords({ category: analysis.category }),
          generateProductNames({
            category: analysis.category,
            keywords: analysis.keywords,
            trendKeywords: [],
            style: analysis.style,
            platform: analysis.platform,
          }),
        ])
        emit({
          type: 'names',
          data: namingResult.names,
          trendTags: namingResult.trendTags,
        })
        await supabase.from('generations').insert({
          project_id: projectId,
          type: 'naming',
          payload: { ...namingResult, trendKeywords } as unknown as Record<string, unknown>,
        })

        // ── Step 4: tagline ────────────────────────────────────────────────
        emit({ type: 'progress', step: 'tagline', percent: 70 })
        const primaryName = namingResult.names[0]?.name ?? analysis.category
        const taglineResult = await generateTagline({
          productName: primaryName,
          category: analysis.category,
          keywords: analysis.keywords,
          mood: analysis.mood,
        })
        emit({ type: 'tagline', data: taglineResult.tagline })
        await supabase.from('generations').insert({
          project_id: projectId,
          type: 'tagline',
          payload: taglineResult as unknown as Record<string, unknown>,
        })

        // ── Step 5: description (streamObject — 토큰 단위 SSE) ──────────────
        emit({ type: 'progress', step: 'description', percent: 80 })
        const descStream = streamDescription({
          productName: primaryName,
          tagline: taglineResult.tagline,
          category: analysis.category,
          keywords: analysis.keywords,
          mode,
          targetAudience: analysis.targetAudience,
        })

        let lastEmittedLen = 0
        for await (const partial of descStream.partialObjectStream) {
          const current = partial.description ?? ''
          if (current.length > lastEmittedLen) {
            const chunk = current.slice(lastEmittedLen)
            lastEmittedLen = current.length
            emit({ type: 'description_chunk', text: chunk })
          }
        }

        const finalDesc = await descStream.object
        const description = finalDesc.description
        const highlights = finalDesc.highlights ?? []
        emit({ type: 'description_done', data: description, highlights })

        await supabase.from('generations').insert({
          project_id: projectId,
          type: 'description',
          payload: { description, charCount: description.length, highlights } as unknown as Record<string, unknown>,
        })

        // ── 프로젝트 완료 + 크레딧 차감 ───────────────────────────────────
        await supabase
          .from('projects')
          .update({ status: 'done', updated_at: new Date().toISOString() })
          .eq('id', projectId)

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

        emit({ type: 'progress', step: 'description', percent: 100 })
        emit({ type: 'complete', elapsedMs: Date.now() - startTime })
        controller.close()
      } catch (err) {
        console.error('[/api/generate/pipeline] stream error', err)
        const message = err instanceof Error ? err.message : String(err)
        let userMessage = message
        if (/credit|credit_balance|insufficient/i.test(message)) {
          userMessage = 'AI API 크레딧이 부족합니다. 잔액을 확인해주세요.'
        } else if (/401|unauthorized|invalid.*api.*key/i.test(message)) {
          userMessage = 'AI API 키가 유효하지 않습니다.'
        }
        emit({ type: 'error', message: userMessage })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx/프록시 버퍼링 방지
    },
  })
}
