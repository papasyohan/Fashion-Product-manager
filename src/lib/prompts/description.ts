/**
 * 상세 설명 생성 프롬프트 (기능 1개 = 파일 1개 원칙)
 * v1.1: intent-injector 경유
 * v1.2: fashion-curation-style 통합 (4섹션 구조 + 큐레이터 톤)
 */

import { appendIntentSection } from './intent-injector'
import {
  FASHION_CURATION_PREAMBLE,
  FOUR_SECTION_STRUCTURE,
} from './fashion-curation-style'
import type { UserIntent } from '@/lib/ai/types'

export const DESCRIPTION_SYSTEM_PROMPT = `${FASHION_CURATION_PREAMBLE}

[당신의 작업 — 상세 설명 4섹션]
스마트스토어·쿠팡·무신사에 바로 복사해 사용할 수 있는 상세설명을 작성합니다.
스펙 시트가 아니라 매거진 큐레이션이 되어야 합니다.

${FOUR_SECTION_STRUCTURE}

추가 규칙:
- SEO 키워드(소재·계절감·실루엣)는 자연스럽게 본문에 녹임
- 타깃 고객의 라이프스타일에 공감되는 표현
- 같은 형용사를 한 단락 안에서 반복하지 말 것
- 반드시 JSON 형식으로만 응답`

export const buildDescriptionPrompt = (params: {
  productName: string
  tagline: string
  category: string
  keywords: string[]
  mode: 'quick' | 'studio'
  targetAudience?: string
  specs?: Record<string, string | string[]>
  userIntent?: UserIntent
  refinement?: string
}) => {
  const targetLength = params.mode === 'studio' ? '600~800자' : '400~600자'

  const specsSection = params.specs
    ? `\n제품 스펙:\n${Object.entries(params.specs)
        .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('\n')}`
    : ''

  const base = `다음 제품의 상세 설명을 작성해주세요 (${targetLength}):

상품명: ${params.productName}
홍보문구: ${params.tagline}
카테고리: ${params.category}
핵심 키워드: ${params.keywords.join(', ')}
타깃 고객: ${params.targetAudience ?? '20~40대'}${specsSection}

아래 JSON 형식으로 응답:
{
  "description": "상세 설명 본문 (스펙은 · 기호로 구분)",
  "charCount": 문자수(숫자),
  "highlights": ["핵심 셀링포인트1", "셀링포인트2", "셀링포인트3"]
}`

  return appendIntentSection(base, params.userIntent, params.refinement)
}
