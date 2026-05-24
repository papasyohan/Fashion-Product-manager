/**
 * 크레딧 가드 미들웨어 (T-08)
 * 모든 AI 생성 전 크레딧/플랜 검사
 */

import { createClient } from '@/lib/supabase/server'

type Operation = 'quick' | 'studio_text' | 'studio_thumbnail' | 'studio_fitting'
type Resolution = '1K' | '2K' | '4K'
type Plan = 'free' | 'starter' | 'pro' | 'business'

export const CREDIT_COSTS: Record<Operation, number> = {
  quick: 1,
  studio_text: 1,
  studio_thumbnail: 3,
  studio_fitting: 5,  // Phase 4 — AI Fitting (모델 합성, multi-reference)
}

// 4K는 Pro 이상만 허용
const RESOLUTION_PLAN_GATE: Record<Resolution, Plan[]> = {
  '1K': ['free', 'starter', 'pro', 'business'],
  '2K': ['starter', 'pro', 'business'],
  '4K': ['pro', 'business'],
}

// Phase 4 — Operation 별 플랜 게이트 (해상도와 별개)
const OPERATION_PLAN_GATE: Partial<Record<Operation, Plan[]>> = {
  studio_fitting: ['pro', 'business'],  // AI Fitting 은 Pro 이상만
}

export interface CreditGuardResult {
  allowed: boolean
  reason?: string
  creditsRequired?: number
  creditsAfter?: number
  upgradeUrl?: string
}

export interface CreditGuardParams {
  userId: string
  operation: Operation
  resolution?: Resolution
  /** 동적 비용 (Phase 4 D안 — AI Fitting 비율 개수별 차등) */
  creditsOverride?: number
  // 테스트용 mock 파라미터
  mockCreditsLeft?: number
  mockPlan?: Plan
}

/**
 * Phase 4 D안 — AI Fitting 의 비율 개수별 동적 크레딧.
 * 1장 = 2 / 2장 = 4 / 3장 = 5 (할인) / 4장+ = 6
 */
export function aiFittingCredits(count: number): number {
  if (count <= 1) return 2
  if (count === 2) return 4
  if (count === 3) return 5
  return 6
}

export async function checkCreditGuard(
  params: CreditGuardParams
): Promise<CreditGuardResult> {
  // ── 개발/테스트 우회 ──────────────────────────────────────────────────────
  // .env.local 에 DEV_BYPASS_CREDITS=true 를 설정하면 크레딧/플랜 검사 전체 스킵
  if (process.env.DEV_BYPASS_CREDITS === 'true') {
    return { allowed: true, creditsRequired: 0, creditsAfter: 9999 }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const { userId, operation, resolution = '2K', creditsOverride, mockCreditsLeft, mockPlan } = params

  let creditsLeft: number
  let plan: Plan

  if (mockCreditsLeft !== undefined && mockPlan !== undefined) {
    // 테스트 모드
    creditsLeft = mockCreditsLeft
    plan = mockPlan
  } else if (mockCreditsLeft !== undefined) {
    creditsLeft = mockCreditsLeft
    plan = 'free'
  } else {
    // 실제 DB 조회
    const supabase = await createClient()
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('credits_left, plan')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return {
        allowed: false,
        reason: '사용자 정보를 찾을 수 없습니다.',
      }
    }

    creditsLeft = profile.credits_left
    plan = profile.plan as Plan
  }

  // Phase 4 — 동적 비용 override 우선 (AI Fitting 비율 개수별)
  const required = creditsOverride ?? CREDIT_COSTS[operation]

  // Phase 4 — Operation 자체 플랜 게이트 (예: AI Fitting 은 Pro 이상)
  const opAllowedPlans = OPERATION_PLAN_GATE[operation]
  if (opAllowedPlans && !opAllowedPlans.includes(plan)) {
    const opLabel: Partial<Record<Operation, string>> = {
      studio_fitting: 'AI Fitting',
    }
    return {
      allowed: false,
      reason: `${opLabel[operation] ?? operation} 기능은 Pro 이상 플랜에서만 사용 가능합니다.`,
      upgradeUrl: '/billing',
    }
  }

  // 해상도 플랜 게이팅 (보안 규칙: 4K는 Pro 이상)
  const allowedPlans = RESOLUTION_PLAN_GATE[resolution]
  if (!allowedPlans.includes(plan)) {
    return {
      allowed: false,
      reason: `${resolution} 해상도는 Pro 이상 플랜에서만 사용 가능합니다.`,
      upgradeUrl: '/billing',
    }
  }

  // 크레딧 부족 확인
  if (creditsLeft < required) {
    return {
      allowed: false,
      reason: `크레딧이 부족합니다. (필요: ${required}, 잔여: ${creditsLeft})`,
      creditsRequired: required,
      upgradeUrl: '/billing',
    }
  }

  return {
    allowed: true,
    creditsRequired: required,
    creditsAfter: creditsLeft - required,
  }
}

/**
 * 크레딧 차감 (생성 성공 후 호출)
 * Phase 4: 동적 비용 amount override 지원
 */
export async function deductCredits(params: {
  userId: string
  operation: Operation
  /** 동적 비용 (없으면 CREDIT_COSTS 기본값) */
  amount?: number
}): Promise<void> {
  // 개발 우회 모드: 실제 차감 스킵
  if (process.env.DEV_BYPASS_CREDITS === 'true') return

  const supabase = await createClient()
  const cost = params.amount ?? CREDIT_COSTS[params.operation]

  await supabase.rpc('deduct_credits', {
    p_user_id: params.userId,
    p_amount: cost,
  })
}
