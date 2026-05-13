/**
 * 상세 설명 생성 (T-05) — AI SDK + 라우터 기반
 * 작업별 모델 env: MODEL_DESCRIPTION
 *
 * 두 가지 모드 제공:
 *  - generateDescription:  비스트리밍 (개별 /api/generate/description 엔드포인트)
 *  - streamDescription:    스트리밍 (파이프라인 SSE에서 토큰 단위 전송)
 */

import { generateObject, streamObject } from 'ai'
import { runWithFallback, resolveModels } from '@/lib/ai/router'
import { DescriptionSchema } from '@/lib/ai/types'
import {
  DESCRIPTION_SYSTEM_PROMPT,
  buildDescriptionPrompt,
} from '@/lib/prompts/description'

export interface DescriptionResult {
  description: string
  charCount: number
  highlights: string[]
}

export type DescriptionParams = {
  productName: string
  tagline: string
  category: string
  keywords: string[]
  mode: 'quick' | 'studio'
  targetAudience?: string
  specs?: Record<string, string | string[]>
}

// ─── 비스트리밍 (개별 엔드포인트용) ──────────────────────────────────────────

export async function generateDescription(
  params: DescriptionParams
): Promise<DescriptionResult> {
  const result = await runWithFallback('description', (model) =>
    generateObject({
      model,
      schema: DescriptionSchema,
      system: DESCRIPTION_SYSTEM_PROMPT,
      prompt: buildDescriptionPrompt(params),
      maxOutputTokens: params.mode === 'studio' ? 1024 : 768,
    })
  )

  return {
    description: result.object.description,
    charCount: result.object.description.length,
    highlights: result.object.highlights ?? [],
  }
}

// ─── 스트리밍 (파이프라인 SSE용) ─────────────────────────────────────────────

/**
 * 부분 객체를 점진적으로 yield 한다.
 * streamObject 는 JSON 스키마를 만족할 때까지 부분 객체를 계속 갱신해서 보내준다.
 *
 *   const { partialObjectStream, object } = await streamDescription(params)
 *   for await (const partial of partialObjectStream) {
 *     // partial.description 가 점점 길어진다
 *   }
 *   const final = await object  // 완성된 DescriptionOutput
 *
 * Fallback 은 1순위 시작 직전 실패만 잡는다 (이미 스트리밍 시작된 후엔 재시도 불가).
 */
export function streamDescription(params: DescriptionParams) {
  const { primary } = resolveModels('description')
  return streamObject({
    model: primary,
    schema: DescriptionSchema,
    system: DESCRIPTION_SYSTEM_PROMPT,
    prompt: buildDescriptionPrompt(params),
    maxOutputTokens: params.mode === 'studio' ? 1024 : 768,
  })
}
