/**
 * Toss Payments 웹훅 핸들러 (Sprint 3)
 * POST /api/webhooks/toss
 *
 * 이벤트:
 *  - PAYMENT_STATUS_CHANGED (결제 완료) → 플랜 업그레이드 + 크레딧 지급
 *  - CANCEL_PAYMENT → 플랜 다운그레이드
 *
 * Toss 서명 검증: HMAC-SHA256(secret, payload)
 *
 * 보안 수정 (BUG-02/03/04/11):
 *  - TOSS_SECRET_KEY 미설정 시 서비스 불가 응답 (우회 방지)
 *  - metadata.userId 우선 사용 (orderId 파싱보다 신뢰도 높음)
 *  - 결제 처리 실패 시 500 반환 (Toss 재시도 유도)
 *  - 전화번호·주문 정보 console.log 제거
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
 * orderId에서 userId(UUID) 추출 — fallback 전용.
 * 결제 생성 시 metadata.userId 를 포함했다면 그쪽을 우선 사용해야 함.
 * 형식: {prefix1}-{prefix2}-{uuid(5 segments)}-{timestamp}
 */
function extractUserIdFromOrderId(orderId: string, prefixCount = 2): string {
  const parts = orderId.split('-')
  // UUID = 5 segments (8-4-4-4-12)
  return parts.slice(prefixCount, prefixCount + 5).join('-')
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // ─── 서명 검증 — secret 없으면 서비스 불가 (우회 차단) ──────────────────
  const tossSecret = process.env.TOSS_SECRET_KEY
  if (!tossSecret) {
    console.error('[Toss Webhook] TOSS_SECRET_KEY not configured — rejecting request')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const signature = request.headers.get('Toss-Payments-Signature')
  const expected = createHmac('sha256', tossSecret)
    .update(rawBody)
    .digest('base64')

  if (signature !== expected) {
    console.warn('[Toss Webhook] Signature mismatch — possible forged request')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 민감 정보 노출 없이 최소 로깅
  console.log('[Toss Webhook] received:', event.eventType)

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    if (event.eventType === 'PAYMENT_STATUS_CHANGED' && event.data?.status === 'DONE') {
      await handlePaymentSuccess(supabase, event.data)
    }

    if (event.eventType === 'CANCEL_PAYMENT') {
      await handlePaymentCancel(supabase, event.data)
    }
  } catch (err) {
    // 처리 실패 시 500 반환 → Toss가 재시도함 (결제 누락 방지)
    console.error('[Toss Webhook] handler error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal processing error' }, { status: 500 })
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

  // metadata.userId 우선 — orderId 파싱은 fallback (BUG-03 완화)
  const userId = data.metadata?.userId || extractUserIdFromOrderId(orderId, 2)

  if (!planName || !userId) {
    console.error('[Toss Webhook] Cannot resolve plan or userId from orderId')
    throw new Error('Cannot resolve plan or userId')
  }

  const credits = PLAN_CREDITS[planName] ?? 0

  // SEC-07: userId가 실제 DB에 존재하는지 검증 (조작된 metadata 방어)
  const { data: profileCheck } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', userId)
    .single()
  if (!profileCheck) {
    throw new Error(`Invalid userId in payment metadata: ${userId}`)
  }

  // user_profiles 업데이트 (플랜 변경 + 크레딧 리셋)
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({
      plan: planName,
      credits_left: credits,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (updateError) throw new Error(`user_profiles update failed: ${updateError.message}`)

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
    metadata: { plan: planName },
  })

  console.log(`[Toss Webhook] Plan upgraded → ${planName} (+${credits} credits)`)
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

  // metadata.userId 우선
  const userId = fallbackUserId || extractUserIdFromOrderId(orderId, 2)

  if (!packId || !userId) {
    throw new Error('Cannot parse topup orderId or userId')
  }

  const creditsToAdd = TOPUP_CREDITS[packId] ?? 0
  if (creditsToAdd === 0) {
    throw new Error(`Unknown topup packId: ${packId}`)
  }

  // credits_left 증가 (SQL: credits_left + creditsToAdd, GREATEST 적용)
  const { error: rpcError } = await supabase.rpc('add_credits', { p_user_id: userId, p_amount: creditsToAdd })
  if (rpcError) throw new Error(`add_credits RPC failed: ${rpcError.message}`)

  // usage_events 기록
  await supabase.from('usage_events').insert({
    user_id: userId,
    event_type: 'credit_purchased',
    credits_used: -creditsToAdd, // 음수 = 크레딧 증가
    metadata: { packId, creditsAdded: creditsToAdd },
  })

  console.log(`[Toss Webhook] Topup +${creditsToAdd} credits (${packId})`)
}

// ─── 결제 취소 ──────────────────────────────────────────────────────────────

async function handlePaymentCancel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  data: { orderId: string; metadata?: { userId?: string } }
) {
  // topup 취소는 크레딧을 다시 차감하지 않음 (단순 취소 알림만)
  if (data.orderId.startsWith('topup-')) {
    console.log('[Toss Webhook] Topup cancelled (no action)')
    return
  }

  const userId = data.metadata?.userId || extractUserIdFromOrderId(data.orderId, 2)
  if (!userId) throw new Error('Cannot resolve userId for cancel')

  await supabase
    .from('user_profiles')
    .update({ plan: 'free', credits_left: 3 })
    .eq('id', userId)

  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('user_id', userId)
    .eq('status', 'active')

  console.log('[Toss Webhook] Plan cancelled → free')
}
