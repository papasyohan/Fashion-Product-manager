import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HistoryClient } from './history-client'

export const metadata = {
  title: 'ProductCraft AI — 히스토리',
}

// 플랜별 보관 기간 (일수, null = 무제한)
const RETENTION_DAYS: Record<string, number | null> = {
  free:     7,
  starter:  30,
  pro:      null,
  business: null,
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // ─── 플랜 먼저 조회 → DB 레벨 날짜 필터 적용 ────────────────────────────
  // 이전: 병렬 조회 후 클라이언트 JS 필터 → payload 전체를 불필요하게 수신
  // 이후: 플랜 확정 후 DB에서 바로 날짜 범위 제한 → 전송 데이터 대폭 절감
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = (profile?.plan as string) ?? 'free'
  const retentionDays = RETENTION_DAYS[plan] ?? 7

  // DB 레벨 날짜 필터 — history-list에 필요한 필드만 선택
  const cutoffIso = retentionDays !== null
    ? (() => { const d = new Date(); d.setDate(d.getDate() - retentionDays); return d.toISOString() })()
    : null

  const baseQuery = supabase
    .from('projects')
    .select(`
      id,
      mode,
      status,
      product_image_url,
      created_at,
      updated_at,
      generations (
        type,
        payload
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: projects } = await (
    cutoffIso ? baseQuery.gte('created_at', cutoffIso) : baseQuery
  )

  return <HistoryClient projects={projects ?? []} plan={plan} retentionDays={retentionDays} />
}
