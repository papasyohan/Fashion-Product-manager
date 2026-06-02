/**
 * 상세 설명 생성 프롬프트 (기능 1개 = 파일 1개 원칙)
 * v1.1: intent-injector 경유
 * v1.2: fashion-curation-style 통합 (4섹션 구조 + 큐레이터 톤)
 */

import { appendIntentSection } from './intent-injector'
import {
  FASHION_CURATION_PREAMBLE,
  FOUR_SECTION_STRUCTURE,
  POINT_KEYWORDS_GUIDE,
} from './fashion-curation-style'
import type { UserIntent } from '@/lib/ai/types'

export const DESCRIPTION_SYSTEM_PROMPT = `${FASHION_CURATION_PREAMBLE}

[당신의 작업 — 상세 설명 4섹션]
스마트스토어·쿠팡·무신사에 바로 복사해 사용할 수 있는 상세설명을 작성합니다.
스펙 시트가 아니라 매거진 큐레이션이 되어야 합니다.

${FOUR_SECTION_STRUCTURE}

${POINT_KEYWORDS_GUIDE}

추가 규칙:
- SEO 키워드(소재·계절감·실루엣)는 자연스럽게 본문에 녹임
- 소재 섹션은 반드시 원단명(린넨·코튼·니트 등)을 구체적으로 명시 — "부드러운 원단" 같은 모호 표현 금지
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
  /** 소재 구성 정보 (이미지 분석 결과 — 있을 때만 전달) */
  materials?: string[]
}) => {
  const targetLength = params.mode === 'studio' ? '600~800자' : '400~600자'

  const specsSection = params.specs
    ? `\n제품 스펙:\n${Object.entries(params.specs)
        .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('\n')}`
    : ''

  const materialsSection = params.materials && params.materials.length > 0
    ? `\n소재 정보: ${params.materials.join(', ')} → 소재 섹션에 반영 (구성 비율은 이 정보가 있을 때만 포함)`
    : ''

  const base = `다음 제품의 상세 설명을 작성해주세요 (${targetLength}):

상품명: ${params.productName}
홍보문구: ${params.tagline}
카테고리: ${params.category}
핵심 키워드: ${params.keywords.join(', ')}
타깃 고객: ${params.targetAudience ?? '20~40대'}${materialsSection}${specsSection}

아래 JSON 형식으로 응답:
{
  "description": "상세 설명 본문 (4섹션 구조, 스펙은 · 기호로 구분)",
  "charCount": 문자수(숫자),
  "highlights": ["핵심 셀링포인트 문장1", "문장2", "문장3"],
  "pointKeywords": ["소재태그", "핏태그", "시즌태그", "스타일태그"]
}`

  return appendIntentSection(base, params.userIntent, params.refinement)
}
