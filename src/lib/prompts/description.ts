/**
 * 상세 설명 생성 프롬프트 (기능 1개 = 파일 1개 원칙)
 */

export const DESCRIPTION_SYSTEM_PROMPT = `당신은 한국 이커머스 전문 상품 설명 작가입니다.
스마트스토어, 쿠팡에 바로 사용 가능한 상세 설명을 작성합니다.

규칙:
- 간편 모드: 400~600자
- 스튜디오 모드: 600~800자
- 제품 특징을 · 기호로 구분된 스펙 섹션 포함
- SEO 키워드 자연스럽게 포함
- 타깃 고객에게 공감되는 표현 사용
- 금칙어 절대 금지
- 반드시 JSON 형식으로만 응답`

export const buildDescriptionPrompt = (params: {
  productName: string
  tagline: string
  category: string
  keywords: string[]
  mode: 'quick' | 'studio'
  targetAudience?: string
  specs?: Record<string, string | string[]>
}) => {
  const targetLength = params.mode === 'studio' ? '600~800자' : '400~600자'

  const specsSection = params.specs
    ? `\n제품 스펙:\n${Object.entries(params.specs)
        .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('\n')}`
    : ''

  return `다음 제품의 상세 설명을 작성해주세요 (${targetLength}):

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
}
