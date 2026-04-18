/**
 * 한줄 홍보문구 생성 프롬프트 (기능 1개 = 파일 1개 원칙)
 */

export const TAGLINE_SYSTEM_PROMPT = `당신은 한국 이커머스 전문 카피라이터입니다.
35자 이내의 강력한 한줄 홍보문구를 작성합니다.

규칙:
- 반드시 35자 이하
- 검색 노출 최적화 키워드 포함
- 감성적이고 구매 욕구를 자극하는 문구
- 금칙어 절대 금지: 치료, 완치, 최고, 국내 유일
- 반드시 JSON 형식으로만 응답`

export const buildTaglinePrompt = (params: {
  productName: string
  category: string
  keywords: string[]
  mood?: string
}) => `다음 제품의 한줄 홍보문구를 작성해주세요:

상품명: ${params.productName}
카테고리: ${params.category}
핵심 키워드: ${params.keywords.join(', ')}
무드: ${params.mood ?? '미정'}

아래 JSON 형식으로 응답 (tagline은 반드시 35자 이하):
{
  "tagline": "한줄 홍보문구 (35자 이하)",
  "charCount": 문자수(숫자),
  "seoKeywords": ["포함된 SEO 키워드1", "키워드2"]
}`
