/**
 * 한줄 홍보문구 생성 프롬프트 (기능 1개 = 파일 1개 원칙)
 * v1.1: intent-injector 경유
 * v1.2: fashion-curation-style 통합 (패션 큐레이터 톤)
 */

import { appendIntentSection } from './intent-injector'
import { FASHION_CURATION_PREAMBLE, TAGLINE_PATTERNS } from './fashion-curation-style'
import type { UserIntent } from '@/lib/ai/types'

export const TAGLINE_SYSTEM_PROMPT = `${FASHION_CURATION_PREAMBLE}

[당신의 작업 — 한줄 홍보문구]
35자 이내의 매거진 톤 한줄 카피를 작성합니다.
가격·할인 어필이 아니라, 무드·실루엣·소재의 본질을 한 줄에 압축합니다.

${TAGLINE_PATTERNS}

규칙:
- 반드시 35자 이하
- 검색 노출 최적화 키워드를 자연스럽게 포함
- 따옴표 미포함 (UI에서 자동 추가)
- 감성·결감 중심, 가격·할인 어필 금지
- 반드시 JSON 형식으로만 응답`

export const buildTaglinePrompt = (params: {
  productName: string
  category: string
  keywords: string[]
  mood?: string
  userIntent?: UserIntent
  refinement?: string
}) =>
  appendIntentSection(
    `다음 제품의 한줄 홍보문구를 작성해주세요:

상품명: ${params.productName}
카테고리: ${params.category}
핵심 키워드: ${params.keywords.join(', ')}
무드: ${params.mood ?? '미정'}

아래 JSON 형식으로 응답 (tagline은 반드시 35자 이하):
{
  "tagline": "한줄 홍보문구 (35자 이하)",
  "charCount": 문자수(숫자),
  "seoKeywords": ["포함된 SEO 키워드1", "키워드2"]
}`,
    params.userIntent,
    params.refinement,
  )
