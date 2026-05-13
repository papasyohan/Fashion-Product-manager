/**
 * Toss Payments 웹훅 핸들러 (Sprint 3)
 * POST /api/webhooks/toss
 *
 * 이벤트:
 *  - PAYMENT_STATUS_CHANGED (결제 완료) → 플랜 업그레이드 + 크레딧 지급
 *  - CANCEL_PAYMENT → 플랜 다운그레이드
 *
 * Toss 서명 검증: HMAC-SHA256(secret, payload)
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

// ─── 플랜별 크레딧 지급량 ─────────────────────────────────────────────────────

const PLAN_CREDITS: Record<string, number> = {
  starter:  50,
  pro:      200,
  business: 1000,
}

// ─── 상품 ID → 플랜 매핑 ─────────────────────────────────────────────────────

const ORDER_ID_PLAN_MAP: Record<string, string> = {
  'plan-starter':  'starter',
  'plan-pro':      'pro',
  'plan-business': 'business',
}

// ─── 크레딧 충전 팩 ───────────────────────────────────────────────────────────

const TOPUP_CREDITS: Record<string, number> = {
  topup10:  10,
  topup30:  30,
  topup100: 100,
}

/**
 * orderId에서 userId(UUID) 추출
 * 형식: {prefix1}-{prefix2}-{uuid(5 segments)}-{timestamp}
 * UUID는 하이픈 포함이므로 parts[2..6]을 재조합해야 함
 */
function extractUserId(orderId: string, prefixCount = 2): string {
  const parts = orderId.split('-')
  // UUID = 5 segments (8-4-4-4-12)
  return parts.slice(prefixCount, prefixCount + 5).join('-')
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // ─── 서명 검증 ──────────────────────────────────────────────────────────
  const tossSecret = process.env.TOSS_SECRET_KEY
  if (tossSecret) {
    const signature = request.headers.get('Toss-Payments-Signature')
    const expected = createHmac('sha256', tossSecret)
      .update(rawBody)
      .digest('base64')

    if (signature !== expected) {
      console.warn('[Toss Webhook] Signature mismatch')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  const event = JSON.parse(rawBody)
  console.log('[Toss Webhook] event:', event.eventType, event.data?.orderId)

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (event.eventType === 'PAYMENT_STATUS_CHANGED' && event.data?.status === 'DONE') {
    await handlePaymentSuccess(supabase, event.data)
  }

  if (event.eventType === 'CANCEL_PAYMENT') {
    await handlePaymentCancel(supabase, event.data)
  }

  return NextResponse.json({ received: true })
}

// ─── 결제 성공 ──────────────────────────────────────────────────────────────

async function handlePaymentSuccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  data: {
    orderId: string
    customerEmail?: string
    metadata?: { userId?: string }
  }
) {
  const { orderId } = data

  // topup-{packId}-{uuid}-{timestamp} 형식 분기
  if (orderId.startsWith('topup-')) {
    await handleTopupSuccess(supabase, orderId, data.metadata?.userId)
    return
  }

  // plan-{plan}-{uuid}-{timestamp} 형식
  const parts = orderId.split('-')
  const planKey = `${parts[0]}-${parts[1]}` // 'plan-pro'
  const planName = ORDER_ID_PLAN_MAP[planKey]
  // UUID는 parts[2..6] (5 segments)
  const userId = extractUserId(orderId, 2) || data.metadata?.userId

  if (!planName || !userId) {
    console.error('[Toss Webhook] Cannot parse plan orderId:', orderId)
    return
  }

  const credits = PLAN_CREDITS[planName] ?? 0

  // user_profiles 업데이트 (플랜 변경 + 크레딧 리셋)
  await supabase
    .from('user_profiles')
    .update({
      plan: planName,
      credits_left: credits,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  // subscriptions 기록
  await supabase.from('subscriptions').upsert({
    user_id: userId,
    plan: planName,
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    toss_order_id: orderId,
  })

  // usage_events 기록
  await supabase.from('usage_events').insert({
    user_id: userId,
    event_type: 'plan_upgraded',
    credits_used: -credits, // 음수 = 크레딧 증가
    metadata: { plan: planName, orderId },
  })

  console.log(`[Toss Webhook] Plan upgraded: userId=${userId} → ${planName} (+${credits} credits)`)
}

// ─── 크레딧 충전 성공 ────────────────────────────────────────────────────────

async function handleTopupSuccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  orderId: string,
  fallbackUserId?: string
) {
  // topup-{packId}-{uuid}-{timestamp}
  const parts = orderId.split('-')
  const packId = parts[1] // 'topup10' | 'topup30' | 'topup100'
  const userId = extractUserId(orderId, 2) || fallbackUserId

  if (!packId || !userId) {
    console.error('[Toss Webhook] Cannot parse topup orderId:', orderId)
    return
  }

  const creditsToAdd = TOPUP_CREDITS[packId] ?? 0
  if (creditsToAdd === 0) {
    console.error('[Toss Webhook] Unknown topup packId:', packId)
    return
  }

  // credits_left 증가 (SQL: credits_left + creditsToAdd, GREATEST 적용)
  await supabase.rpc('add_credits', { p_user_id: userId, p_amount: creditsToAdd })

  // usage_events 기록
  await supabase.from('usage_events').insert({
    user_id: userId,
    event_type: 'credit_purchased',
    credits_used: -creditsToAdd, // 음수 = 크레딧 증가
    metadata: { packId, creditsAdded: creditsToAdd, orderId },
  })

  console.log(`[Toss Webhook] Topup: userId=${userId} +${creditsToAdd} credits (${packId})`)
}

// ─── 결제 취소 ──────────────────────────────────────────────────────────────

async function handlePaymentCancel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  data: { orderId: string; metadata?: { userId?: string } }
) {
  // topup 취소는 크레딧을 다시 차감하지 않음 (단순 취소 알림만)
  if (data.orderId.startsWith('topup-')) {
    console.log('[Toss Webhook] Topup cancelled (no action):', data.orderId)
    return
  }
  const userId = extractUserId(data.orderId, 2) || data.metadata?.userId
  if (!userId) return

  await supabase
    .from('user_profiles')
    .update({ plan: 'free', credits_left: 3 })
    .eq('id', userId)

  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('user_id', userId)
    .eq('status', 'active')

  console.log(`[Toss Webhook] Plan cancelled: userId=${userId} → free`)
}
