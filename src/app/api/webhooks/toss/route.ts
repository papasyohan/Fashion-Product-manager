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
  // orderId 형식: plan-pro-{userId}-{timestamp}
  const parts = data.orderId.split('-')
  const planKey = `${parts[0]}-${parts[1]}` // 'plan-pro'
  const planName = ORDER_ID_PLAN_MAP[planKey]
  const userId = parts[2] ?? data.metadata?.userId

  if (!planName || !userId) {
    console.error('[Toss Webhook] Cannot parse orderId:', data.orderId)
    return
  }

  const credits = PLAN_CREDITS[planName] ?? 0

  // user_profiles 업데이트
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
    toss_order_id: data.orderId,
  })

  // usage_events 기록
  await supabase.from('usage_events').insert({
    user_id: userId,
    event_type: 'plan_upgraded',
    credits_used: -credits, // 음수 = 크레딧 증가
    metadata: { plan: planName, orderId: data.orderId },
  })

  console.log(`[Toss Webhook] Plan upgraded: userId=${userId} → ${planName} (+${credits} credits)`)
}

// ─── 결제 취소 ──────────────────────────────────────────────────────────────

async function handlePaymentCancel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  data: { orderId: string; metadata?: { userId?: string } }
) {
  const parts = data.orderId.split('-')
  const userId = parts[2] ?? data.metadata?.userId
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
