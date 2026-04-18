/**
 * 한줄 홍보문구 생성 래퍼 (T-04)
 */

import { callClaude, parseJsonResponse } from '@/lib/ai/client'
import { TAGLINE_SYSTEM_PROMPT, buildTaglinePrompt } from '@/lib/prompts/tagline'

export interface TaglineResult {
  tagline: string
  charCount: number
  seoScore: number
  seoKeywords: string[]
}

export async function generateTagline(params: {
  productName: string
  category: string
  keywords: string[]
  mood?: string
}): Promise<TaglineResult> {
  const raw = await callClaude({
    systemPrompt: TAGLINE_SYSTEM_PROMPT,
    userPrompt: buildTaglinePrompt(params),
    maxTokens: 256,
  })

  const parsed = parseJsonResponse<{
    tagline: string
    charCount: number
    seoKeywords: string[]
  }>(raw)

  // 35자 초과 시 자동 트림
  let tagline = parsed.tagline
  if (tagline.length > 35) {
    tagline = tagline.slice(0, 35)
  }

  // SEO 점수 계산 (키워드 포함 여부 기반 간단 점수)
  const matchedKeywords = params.keywords.filter((kw) =>
    tagline.includes(kw)
  )
  const seoScore = Math.min(100, matchedKeywords.length * 20 + 40)

  return {
    tagline,
    charCount: tagline.length,
    seoScore,
    seoKeywords: parsed.seoKeywords ?? [],
  }
}
