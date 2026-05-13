/**
 * 상품명 생성 (T-03) — AI SDK + 라우터 기반
 * 작업별 모델 env: MODEL_NAMING
 */

import { generateObject } from 'ai'
import { runWithFallback } from '@/lib/ai/router'
import { NamingSchema } from '@/lib/ai/types'
import { NAMING_SYSTEM_PROMPT, buildNamingPrompt } from '@/lib/prompts/naming'

export interface NamingResult {
  names: Array<{ name: string; trend: string }>
  trendTags: string[]
}

export async function generateProductNames(params: {
  category: string
  keywords: string[]
  trendKeywords: string[]
  style?: string
  platform?: string
  forbiddenTerms?: string[]
}): Promise<NamingResult> {
  const result = await runWithFallback('naming', (model) =>
    generateObject({
      model,
      schema: NamingSchema,
      system: NAMING_SYSTEM_PROMPT,
      prompt: buildNamingPrompt(params),
      maxOutputTokens: 512,
    })
  )

  // 금칙어 필터링
  const forbidden = params.forbiddenTerms ?? [
    '치료',
    '완치',
    '의학적으로 증명',
    '세계 최고',
    '국내 유일',
  ]
  const filteredNames = result.object.names.map((item) => ({
    ...item,
    name: filterForbiddenTerms(item.name, forbidden),
  }))

  // 전체 트렌드 태그 추출
  const allTags = filteredNames
    .flatMap((n) => n.trend.split(' '))
    .filter((t) => t.startsWith('#'))
    .filter((t, i, arr) => arr.indexOf(t) === i)

  return { names: filteredNames, trendTags: allTags }
}

function filterForbiddenTerms(text: string, terms: string[]): string {
  let result = text
  for (const term of terms) {
    result = result.replaceAll(term, '')
  }
  return result.trim()
}
