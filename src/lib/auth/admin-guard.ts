/**
 * Admin 권한 가드 — Server Component / Route Handler 에서 사용
 *
 * 패턴:
 *   const admin = await requireAdmin()  // throws / redirects if not admin
 *   // ... admin-only code ...
 */

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export interface AdminContext {
  userId: string
  email: string | null
}

/**
 * Server Component 에서 사용 — admin 이 아니면 /studio 로 redirect.
 * RLS 우회 admin 클라이언트도 함께 반환.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, banned_at')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/studio')
  }
  if (profile.banned_at) {
    redirect('/auth/login')
  }

  return {
    userId: user.id,
    email: user.email ?? null,
  }
}

/**
 * Route Handler 에서 사용 — admin 이 아니면 null 반환 (호출자가 403 처리).
 */
export async function checkAdmin(): Promise<AdminContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, banned_at')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || profile.banned_at) return null

  return { userId: user.id, email: user.email ?? null }
}

/**
 * Admin 액션의 감사 로그 기록.
 * 모든 admin 변경 작업 (플랜 변경 / 크레딧 조정 / 정지) 후 호출.
 */
export async function logAdminAction(params: {
  actorId: string
  action: 'plan_changed' | 'credits_adjusted' | 'banned' | 'unbanned' | 'role_changed'
  targetId?: string
  payload?: Record<string, unknown>
}): Promise<void> {
  const admin = await createAdminClient()
  await admin.from('audit_log').insert({
    actor_id: params.actorId,
    action: params.action,
    target_id: params.targetId ?? null,
    payload: (params.payload ?? {}) as Record<string, unknown>,
  })
}
