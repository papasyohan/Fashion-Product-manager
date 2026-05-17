/**
 * 상세페이지 자동 조립 프롬프트 (v1.1 Phase 3.2)
 *
 * LLM 이 분석 결과 + 텍스트 콘텐츠를 받아 셀러에게 최적화된 섹션 구조를 제안.
 * 출력 스키마: DetailPagePlanSchema (lib/ai/types.ts)
 */

import { appendIntentSection } from './intent-injector'
import type { UserIntent } from '@/lib/ai/types'

export const DETAIL_PAGE_PLAN_SYSTEM_PROMPT = `당신은 한국 이커머스 전문 상세페이지 디자이너입니다.
판매 전환율이 높은 상세페이지 구조를 설계합니다.

핵심 원칙:
- hero 섹션이 반드시 첫 번째 (상품명·카피·이미지)
- 그 다음은 셀러 의도에 따라 features → description → keywords → reviews → cta 또는 변형
- 카테고리에 어울리는 추가 text 섹션 1~2개 (예: "사용 시나리오", "구매 후 관리법")
- 전체 섹션 개수: 4~7개 (너무 길지 않게)
- 각 섹션의 텍스트는 한국 셀러 톤으로 자연스럽게
- 금칙어 절대 금지: 치료, 완치, 세계 최고, 국내 유일

JSON 스키마를 정확히 지켜 응답하세요.`

export const buildDetailPagePlanPrompt = (params: {
  productName: string
  tagline: string
  description: string
  category: string
  keywords: string[]
  features: string[]
  userIntent?: UserIntent
  refinement?: string
}) =>
  appendIntentSection(
    `다음 제품 정보를 바탕으로 상세페이지 구조를 설계해주세요:

상품명: ${params.productName}
홍보문구: ${params.tagline}
카테고리: ${params.category}
핵심 키워드: ${params.keywords.join(', ')}
주요 특징: ${params.features.join(', ')}

기본 설명:
${params.description}

요청:
- 4~7개의 섹션으로 구성
- hero 가 반드시 첫 번째
- features, description, keywords, reviews, cta 는 적어도 1개씩 포함
- 카테고리·셀러 의도에 어울리는 text 섹션을 1~2개 추가 (예: "이렇게 사용하세요", "보관·세탁 안내")
- 모든 텍스트는 자연스러운 한국어로 작성
- 각 섹션 안의 content/items 는 풍부하고 구체적으로`,
    params.userIntent,
    params.refinement,
  )
