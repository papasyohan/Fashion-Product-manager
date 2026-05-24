/**
 * 플랜 설정 공유 타입/상수 — 서버·클라이언트 모두에서 import 가능
 * (서버 전용 DB 함수는 plan-settings.ts 에만 있음)
 */

export type Plan = 'free' | 'starter' | 'pro' | 'business'
export type Resolution = '1K' | '2K' | '4K'

/** 코드 기본값 — DB 조회 실패 시 fallback */
export const DEFAULT_PLAN_RESOLUTION: Record<Plan, Resolution> = {
  free:     '1K',
  starter:  '2K',
  pro:      '2K',
  business: '4K',
}

/** 해상도 표시 레이블 */
export const RESOLUTION_LABELS: Record<Resolution, string> = {
  '1K': '1K (1024px)',
  '2K': '2K (2048px)',
  '4K': '4K (4096px)',
}

/** 플랜 표시 레이블 */
export const PLAN_LABELS: Record<Plan, string> = {
  free:     'FREE',
  starter:  'STARTER',
  pro:      'PRO',
  business: 'BUSINESS',
}

export const PLANS: Plan[] = ['free', 'starter', 'pro', 'business']
export const RESOLUTIONS: Resolution[] = ['1K', '2K', '4K']
