/**
 * Admin 유저 변경 API
 * PATCH /api/admin/users/[id]
 *
 * Body 옵션:
 *   { plan: 'free'|'starter'|'pro'|'business' }  — 플랜 변경
 *   { creditsDelta: number }                     — 크레딧 +/- (양수=추가, 음수=차감)
 *   { ban: true }                                — 계정 정지 (banned_at 설정)
 *   { unban: true }                              — 정지 해제
 *   { role: 'user'|'admin' }                     — 권한 변경
 *
 * 모든 변경은 audit_log 에 기록됨.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { checkAdmin, logAdminAction } from '@/lib/auth/admin-guard'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs' // service role 사용을 위해 Node runtime
export const dynamic = 'force-dynamic'

const PatchSchema = z.object({
  plan: z.enum(['free', 'starter', 'pro', 'business']).optional(),
  creditsDelta: z.number().int().min(-10000).max(10000).optional(),
  ban: z.literal(true).optional(),
  unban: z.literal(true).optional(),
  role: z.enum(['user', 'admin']).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: targetId } = await params

  // 권한 확인
  const admin = await checkAdmin()
  if (!admin) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  let parsed
  try {
    const body = await request.json()
    parsed = PatchSchema.safeParse(body)
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 })
  }
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supa = await createAdminClient()

  // 본인을 admin → user 로 강등 방지
  if (parsed.data.role === 'user' && targetId === admin.userId) {
    return NextResponse.json(
      { error: '본인의 admin 권한은 강등할 수 없습니다.' },
      { status: 400 }
    )
  }

  const updates: Record<string, unknown> = {}
  const auditPayload: Record<string, unknown> = {}

  // 1) 플랜 변경
  if (parsed.data.plan) {
    updates.plan = parsed.data.plan
    auditPayload.new_plan = parsed.data.plan
    await logAdminAction({
      actorId: admin.userId,
      action: 'plan_changed',
      targetId,
      payload: { plan: parsed.data.plan },
    })
  }

  // 2) 권한 변경
  if (parsed.data.role) {
    updates.role = parsed.data.role
    auditPayload.new_role = parsed.data.role
    await logAdminAction({
      actorId: admin.userId,
      action: 'role_changed',
      targetId,
      payload: { role: parsed.data.role },
    })
  }

  // 3) 정지 / 해제
  if (parsed.data.ban) {
    updates.banned_at = new Date().toISOString()
    auditPayload.banned = true
    await logAdminAction({ actorId: admin.userId, action: 'banned', targetId })
  } else if (parsed.data.unban) {
    updates.banned_at = null
    auditPayload.unbanned = true
    await logAdminAction({ actorId: admin.userId, action: 'unbanned', targetId })
  }

  // updates 적용
  if (Object.keys(updates).length > 0) {
    const { error } = await supa.from('user_profiles').update(updates).eq('id', targetId)
    if (error) {
      console.error('[admin/users PATCH] update failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // 4) 크레딧 조정 (RPC)
  if (parsed.data.creditsDelta && parsed.data.creditsDelta !== 0) {
    const delta = parsed.data.creditsDelta
    const rpc = delta > 0 ? 'add_credits' : 'deduct_credits'
    const amount = Math.abs(delta)
    const { error } = await supa.rpc(rpc, {
      p_user_id: targetId,
      p_amount: amount,
    })
    if (error) {
      console.error('[admin/users PATCH] credit adjust failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    await logAdminAction({
      actorId: admin.userId,
      action: 'credits_adjusted',
      targetId,
      payload: { delta },
    })
  }

  // 최신 행 반환 — 이메일 join
  const { data: profile } = await supa
    .from('user_profiles')
    .select('id, plan, credits_left, role, banned_at, created_at')
    .eq('id', targetId)
    .single()

  let email: string | null = null
  try {
    const { data: { user } } = await supa.auth.admin.getUserById(targetId)
    email = user?.email ?? null
  } catch {
    // ignore
  }

  return NextResponse.json({ ...profile, email })
}
