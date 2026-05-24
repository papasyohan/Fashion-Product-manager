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

  // ─── 플랜 + 프로젝트 목록 병렬 조회 ────────────────────────────────────
  // 이전: profile 조회 완료 후 → 보관 기간 계산 → projects 조회 (순차 2회 왕복)
  // 이후: 두 쿼리를 Promise.all로 동시 실행. plan 기본값(free, 7일)으로
  //       projects 를 넉넉하게 먼저 가져온 뒤, plan에 따라 클라이언트에서 필터.
  //       plan이 pro/business(무제한)이면 cutoff 없이 전체를 가져오므로 안전.
  const FREE_CUTOFF_DAYS = 7 // 가장 짧은 보관 기간 — 기본 쿼리 범위

  const freeCutoff = new Date()
  freeCutoff.setDate(freeCutoff.getDate() - (
    // 무제한 플랜도 있으므로 기본 쿼리는 cutoff 없이 — plan 확정 후 필터
    Math.max(...Object.values(RETENTION_DAYS).map((d) => d ?? FREE_CUTOFF_DAYS))
  ))

  const [profileResult, projectsResult] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('plan')
      .eq('id', user.id)
      .single(),
    supabase
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
      .limit(100),
  ])

  const plan = (profileResult.data?.plan as string) ?? 'free'
  const retentionDays = RETENTION_DAYS[plan] ?? 7

  // plan이 확정된 후 클라이언트 측 보관 기간 필터 적용
  let projects = projectsResult.data ?? []
  if (retentionDays !== null) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - retentionDays)
    projects = projects.filter((p) => new Date(p.created_at) >= cutoff)
  }

  return <HistoryClient projects={projects} plan={plan} retentionDays={retentionDays} />
}
