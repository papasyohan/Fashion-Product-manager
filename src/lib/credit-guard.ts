/**
 * 크레딧 가드 미들웨어 (T-08)
 * 모든 AI 생성 전 크레딧/플랜 검사
 */

import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/types/supabase'

type Operation = 'quick' | 'studio_text' | 'studio_thumbnail'
type Resolution = '1K' | '2K' | '4K'
type Plan = 'free' | 'starter' | 'pro' | 'business'

export const CREDIT_COSTS: Record<Operation, number> = {
  quick: 1,
  studio_text: 1,
  studio_thumbnail: 3,
}

// 4K는 Pro 이상만 허용
const RESOLUTION_PLAN_GATE: Record<Resolution, Plan[]> = {
  '1K': ['free', 'starter', 'pro', 'business'],
  '2K': ['starter', 'pro', 'business'],
  '4K': ['pro', 'business'],
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
  // 테스트용 mock 파라미터
  mockCreditsLeft?: number
  mockPlan?: Plan
}

export async function checkCreditGuard(
  params: CreditGuardParams
): Promise<CreditGuardResult> {
  const { userId, operation, resolution = '2K', mockCreditsLeft, mockPlan } = params

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

  const required = CREDIT_COSTS[operation]

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
 */
export async function deductCredits(params: {
  userId: string
  operation: Operation
}): Promise<void> {
  const supabase = await createClient()
  const cost = CREDIT_COSTS[params.operation]

  await supabase.rpc('deduct_credits', {
    p_user_id: params.userId,
    p_amount: cost,
  })
}
