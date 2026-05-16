/**
 * 이미지 분석 (T-01)
 * AI SDK + 라우터 기반 — 작업별 모델은 env로 제어 (MODEL_ANALYZE)
 */

import { generateObject } from 'ai'
import { runWithFallback } from '@/lib/ai/router'
import { AnalyzeSchema, type AnalyzeOutput, type UserIntent } from '@/lib/ai/types'
import {
  ANALYZE_SYSTEM_PROMPT,
  buildAnalyzePrompt,
} from '@/lib/prompts/analyze'

export type AnalyzeResult = AnalyzeOutput

export interface PreflightResult {
  passed: boolean
  errors: string[]
  warnings: string[]
}

/** 제품 이미지 분석 (vision) — v1.1: userIntent / refinement 옵션 추가 */
export async function analyzeProductImage(params: {
  imageUrl?: string
  imageBase64?: string
  mode: 'quick' | 'studio'
  userIntent?: UserIntent
  refinement?: string
}): Promise<AnalyzeResult> {
  if (!params.imageUrl && !params.imageBase64) {
    throw new Error('imageUrl 또는 imageBase64 중 하나는 필수입니다.')
  }
  if (params.imageUrl && !isValidUrl(params.imageUrl)) {
    throw new Error('유효하지 않은 이미지 URL입니다.')
  }

  // AI SDK는 image content에 URL · data URL · Uint8Array 모두 허용
  const imageContent = params.imageBase64 ?? params.imageUrl
  if (!imageContent) throw new Error('이미지 소스 누락')

  const userPrompt = buildAnalyzePrompt({
    userIntent: params.userIntent,
    refinement: params.refinement,
  })

  const result = await runWithFallback('analyze', (model) =>
    generateObject({
      model,
      schema: AnalyzeSchema,
      system: ANALYZE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image', image: imageContent },
          ],
        },
      ],
      maxOutputTokens: 1024,
    })
  )

  return result.object
}

/**
 * 이미지 사전 검사 (T-02) — 변경 없음 (LLM 호출 없음)
 */
export async function preflightImageCheck(
  base64OrUrl: string
): Promise<PreflightResult> {
  const errors: string[] = []
  const warnings: string[] = []

  if (base64OrUrl.startsWith('data:')) {
    const mimeMatch = base64OrUrl.match(/^data:(image\/[a-z]+);base64,/)
    if (!mimeMatch) {
      errors.push('지원하지 않는 이미지 형식입니다.')
      return { passed: false, errors, warnings }
    }

    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!supportedTypes.includes(mimeMatch[1])) {
      errors.push('해상도(resolution): JPG, PNG, WebP 형식만 지원합니다.')
    }

    const base64Data = base64OrUrl.split(',')[1] ?? ''
    const estimatedBytes = base64Data.length * 0.75
    const estimatedMB = estimatedBytes / (1024 * 1024)

    if (estimatedMB > 20) {
      errors.push('파일 크기는 20MB 이하여야 합니다.')
    }
    if (base64Data.length < 1000) {
      errors.push('해상도(resolution): 이미지 해상도가 너무 낮습니다. 최소 512×512px 이상이어야 합니다.')
    }
  } else if (!isValidUrl(base64OrUrl)) {
    errors.push('유효하지 않은 이미지 URL입니다.')
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  }
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
