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
import { DescriptionSchema, type UserIntent } from '@/lib/ai/types'
import {
  DESCRIPTION_SYSTEM_PROMPT,
  buildDescriptionPrompt,
} from '@/lib/prompts/description'

export interface DescriptionResult {
  description: string
  charCount: number
  highlights: string[]
  /** 포인트 키워드 3~5개 — 소재·핏·시즌·스타일 카테고리의 짧은 태그 */
  pointKeywords: string[]
}

export type DescriptionParams = {
  productName: string
  tagline: string
  category: string
  keywords: string[]
  mode: 'quick' | 'studio'
  targetAudience?: string
  specs?: Record<string, string | string[]>
  userIntent?: UserIntent
  refinement?: string
  /** 소재 구성 정보 (이미지 분석에서 추출, 있을 때만) */
  materials?: string[]
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
    pointKeywords: result.object.pointKeywords ?? [],
  }
}

// ─── 스트리밍 (파이프라인 SSE용) ─────────────────────────────────────────────

/**
 * 부분 객체를 점진적으로 yield 한다.
 * streamObject 는 JSON 스키마를 만족할 때까지 부분 객체를 계속 갱신해서 보내준다.
 *
 *   const { partialObjectStream, object } = streamDescription(params)
 *   for await (const partial of partialObjectStream) {
 *     // partial.description 가 점점 길어진다
 *   }
 *   const final = await object  // 완성된 DescriptionOutput
 *
 * v1.2: primary 가 즉시 실패 (잔액 부족 등) 시 fallback 으로 자동 전환.
 *       단, 이미 스트리밍 시작된 후 mid-stream 실패는 호출자가 generateDescription 으로 재시도해야 함.
 */
export function streamDescription(params: DescriptionParams) {
  const { primary, fallback } = resolveModels('description')

  // 1순위 시도 — onError 핸들러로 즉시 실패 캐치
  // (AI SDK 의 streamObject 는 동기적으로 stream 객체 반환, 에러는 await stream.object 시점에 throw)
  try {
    return streamObject({
      model: primary,
      schema: DescriptionSchema,
      system: DESCRIPTION_SYSTEM_PROMPT,
      prompt: buildDescriptionPrompt(params),
      maxOutputTokens: params.mode === 'studio' ? 1024 : 768,
    })
  } catch (err) {
    // 동기 throw 는 거의 없지만 안전망 — 1순위 시작 자체가 실패하면 fallback
    if (!fallback) throw err
    console.warn('[description-agent] primary streamObject failed immediately, falling back:', err)
    return streamObject({
      model: fallback,
      schema: DescriptionSchema,
      system: DESCRIPTION_SYSTEM_PROMPT,
      prompt: buildDescriptionPrompt(params),
      maxOutputTokens: params.mode === 'studio' ? 1024 : 768,
    })
  }
}
