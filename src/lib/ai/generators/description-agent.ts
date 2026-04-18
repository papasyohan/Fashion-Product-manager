/**
 * 상세 설명 생성 래퍼 (T-05)
 */

import { callClaude, parseJsonResponse } from '@/lib/ai/client'
import {
  DESCRIPTION_SYSTEM_PROMPT,
  buildDescriptionPrompt,
} from '@/lib/prompts/description'

export interface DescriptionResult {
  description: string
  charCount: number
  highlights: string[]
}

export async function generateDescription(params: {
  productName: string
  tagline: string
  category: string
  keywords: string[]
  mode: 'quick' | 'studio'
  targetAudience?: string
  specs?: Record<string, string | string[]>
}): Promise<DescriptionResult> {
  const raw = await callClaude({
    systemPrompt: DESCRIPTION_SYSTEM_PROMPT,
    userPrompt: buildDescriptionPrompt(params),
    maxTokens: params.mode === 'studio' ? 1024 : 768,
  })

  const parsed = parseJsonResponse<{
    description: string
    charCount: number
    highlights: string[]
  }>(raw)

  return {
    description: parsed.description,
    charCount: parsed.description.length,
    highlights: parsed.highlights ?? [],
  }
}
