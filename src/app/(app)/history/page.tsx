import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HistoryClient } from './history-client'
import { mapFittingRows } from '@/lib/history-items'

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

  // AI 피팅 결과(ai_fittings)를 동일한 날짜 윈도우 + limit 로 병렬 조회.
  // ai_fittings 에는 user_id 컬럼이 없어 RLS(project_id -> projects.user_id)로
  // 본인 데이터만 조회된다. 반드시 인증된 createClient 사용 (admin 사용 시 타 사용자 유출).
  // 부모 프로젝트의 mode / product_image_url 을 to-one embed 로 함께 가져옴.
  const fittingsBaseQuery = supabase
    .from('ai_fittings')
    .select(`
      id,
      project_id,
      result_url,
      model_image_url,
      aspect_ratio,
      width,
      height,
      created_at,
      projects (
        mode,
        product_image_url
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  // 프로젝트 + 피팅을 병렬 실행해 추가 지연을 만들지 않음.
  const [{ data: projects }, { data: fittingRows }] = await Promise.all([
    cutoffIso ? baseQuery.gte('created_at', cutoffIso) : baseQuery,
    cutoffIso ? fittingsBaseQuery.gte('created_at', cutoffIso) : fittingsBaseQuery,
  ])

  const fittings = mapFittingRows(fittingRows)

  return (
    <HistoryClient
      projects={projects ?? []}
      fittings={fittings}
      plan={plan}
      retentionDays={retentionDays}
    />
  )
}
