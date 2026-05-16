/**
 * 사용자 의도 / 보정 지시 주입기 (v1.1 UX Customization Loop)
 *
 * 모든 텍스트 생성 prompt builder 는 호출 직전 이 함수로 두 섹션을 자동 append.
 * 비어있으면 아무것도 추가하지 않음 (안전).
 *
 *   import { appendIntentSection } from '@/lib/prompts/intent-injector'
 *
 *   export const buildNamingPrompt = (params) =>
 *     appendIntentSection(
 *       `카테고리: ${params.category}\n...`,
 *       params.userIntent,
 *       params.refinement,
 *     )
 */

import type { UserIntent } from '@/lib/ai/types'

/** chip value(영문 key) → 자연어 라벨 매핑 (모델에게 한국어로 명확히 전달) */
const TONE_LABEL: Record<string, string> = {
  casual:    '캐주얼, 친근한 톤',
  emotional: '감성적, 라이프스타일 톤',
  premium:   '프리미엄, 고급스러운 톤',
  witty:     '위트있고 트렌디한 톤',
}

const CHANNEL_LABEL: Record<string, string> = {
  naver:     '네이버 스마트스토어 — 키워드 노출 중요, 정직한 표현',
  coupang:   '쿠팡 — 가성비·기능 강조',
  musinsa:   '무신사 — 패션/스타일 강조, MZ 감성',
  instagram: '인스타그램 — 짧고 임팩트, 비주얼 친화',
}

/**
 * 의도 객체에서 비어있지 않은 필드만 골라 자연어 섹션을 만든다.
 * 빈 객체나 모든 필드가 undefined 면 빈 문자열 반환.
 */
function buildIntentBlock(intent: UserIntent | undefined): string {
  if (!intent) return ''
  const lines: string[] = []
  if (intent.tone)     lines.push(`- 톤: ${TONE_LABEL[intent.tone] ?? intent.tone}`)
  if (intent.audience) lines.push(`- 타깃 고객: ${intent.audience}`)
  if (intent.channel)  lines.push(`- 판매 채널: ${CHANNEL_LABEL[intent.channel] ?? intent.channel}`)
  if (intent.memo && intent.memo.trim()) lines.push(`- 추가 요청: "${intent.memo.trim()}"`)
  if (lines.length === 0) return ''
  return `\n\n[사용자 의도]\n${lines.join('\n')}\n사용자 의도를 반영해 결과를 생성하세요. 의도가 본문의 다른 지시와 충돌하면 의도를 우선합니다.`
}

/**
 * 보정 지시 섹션. refinement 가 비어있으면 빈 문자열.
 */
function buildRefinementBlock(refinement: string | undefined): string {
  if (!refinement || !refinement.trim()) return ''
  return `\n\n[보정 지시 — 사용자의 재생성 요청]\n"${refinement.trim()}"\n이 보정 지시는 최우선으로 반영되어야 합니다. 단, 금칙어 / 35자 제한 등 시스템 규칙은 깨지 않습니다.`
}

/**
 * 기존 prompt 본문 끝에 [사용자 의도] / [보정 지시] 섹션을 append.
 * 둘 다 비어있으면 원본 그대로 반환.
 */
export function appendIntentSection(
  basePrompt: string,
  userIntent?: UserIntent,
  refinement?: string,
): string {
  return basePrompt + buildIntentBlock(userIntent) + buildRefinementBlock(refinement)
}
