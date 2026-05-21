/**
 * 상품명 생성 프롬프트 (기능 1개 = 파일 1개 원칙)
 * v1.1: intent-injector 경유하여 userIntent / refinement 자동 반영
 * v1.2: fashion-curation-style 통합 (패션 큐레이터 톤)
 */

import { appendIntentSection } from './intent-injector'
import { FASHION_CURATION_PREAMBLE, NAMING_PATTERNS } from './fashion-curation-style'
import type { UserIntent } from '@/lib/ai/types'

export const NAMING_SYSTEM_PROMPT = `${FASHION_CURATION_PREAMBLE}

[당신의 작업 — 상품명 3종 생성]
트렌드 키워드를 반영하여 클릭률 높은 상품명을 생성합니다.

${NAMING_PATTERNS}

규칙:
- 상품명은 최대 40자 이내
- 각 상품명은 같은 제품의 다른 각도 (디테일·실루엣·무드)로 작성
- 금칙어 절대 사용 금지: 치료, 완치, 세계 최고, 국내 유일, 경쟁사 브랜드명
- 반드시 JSON 형식으로만 응답`

export const buildNamingPrompt = (params: {
  category: string
  keywords: string[]
  trendKeywords: string[]
  style?: string
  platform?: string
  userIntent?: UserIntent
  refinement?: string
}) =>
  appendIntentSection(
    `다음 제품 정보로 상품명 3개를 생성해주세요:

카테고리: ${params.category}
핵심 키워드: ${params.keywords.join(', ')}
트렌드 키워드: ${params.trendKeywords.join(', ')}
스타일: ${params.style ?? '미정'}
최적 플랫폼: ${params.platform ?? '범용'}

아래 JSON 형식으로 응답:
{
  "names": [
    {"name": "상품명1 (가성비/실용 각도)", "trend": "#해시태그1 #해시태그2"},
    {"name": "상품명2 (감성/라이프스타일 각도)", "trend": "#해시태그1 #해시태그2"},
    {"name": "상품명3 (기능/스펙 각도)", "trend": "#해시태그1 #해시태그2"}
  ]
}`,
    params.userIntent,
    params.refinement,
  )
