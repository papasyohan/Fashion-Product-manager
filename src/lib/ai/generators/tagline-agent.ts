/**
 * 한줄 홍보문구 생성 (T-04) — AI SDK + 라우터 기반
 * 작업별 모델 env: MODEL_TAGLINE
 */

import { generateObject } from 'ai'
import { runWithFallback } from '@/lib/ai/router'
import { TaglineSchema, type UserIntent } from '@/lib/ai/types'
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
  userIntent?: UserIntent
  refinement?: string
}): Promise<TaglineResult> {
  const result = await runWithFallback('tagline', (model) =>
    generateObject({
      model,
      schema: TaglineSchema,
      system: TAGLINE_SYSTEM_PROMPT,
      prompt: buildTaglinePrompt(params),
      maxOutputTokens: 256,
    })
  )

  let tagline = result.object.tagline
  if (tagline.length > 35) tagline = tagline.slice(0, 35)

  const matchedKeywords = params.keywords.filter((kw) => tagline.includes(kw))
  const seoScore = Math.min(100, matchedKeywords.length * 20 + 40)

  return {
    tagline,
    charCount: tagline.length,
    seoScore,
    seoKeywords: result.object.seoKeywords ?? [],
  }
}
