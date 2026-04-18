/**
 * 상품명 생성 래퍼 (T-03)
 */

import { callClaude, parseJsonResponse } from '@/lib/ai/client'
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
  const raw = await callClaude({
    systemPrompt: NAMING_SYSTEM_PROMPT,
    userPrompt: buildNamingPrompt(params),
    maxTokens: 512,
  })

  const parsed = parseJsonResponse<{ names: Array<{ name: string; trend: string }> }>(raw)

  // 금칙어 필터링
  const forbidden = params.forbiddenTerms ?? ['치료', '완치', '의학적으로 증명', '세계 최고', '국내 유일']
  const filteredNames = parsed.names.map((item) => ({
    ...item,
    name: filterForbiddenTerms(item.name, forbidden),
  }))

  // 전체 트렌드 태그 추출
  const allTags = filteredNames
    .flatMap((n) => n.trend.split(' '))
    .filter((t) => t.startsWith('#'))
    .filter((t, i, arr) => arr.indexOf(t) === i) // 중복 제거

  return { names: filteredNames, trendTags: allTags }
}

function filterForbiddenTerms(text: string, terms: string[]): string {
  let result = text
  for (const term of terms) {
    result = result.replaceAll(term, '')
  }
  return result.trim()
}
