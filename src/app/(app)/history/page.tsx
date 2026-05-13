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

  // 플랜 조회
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = (profile?.plan as string) ?? 'free'
  const retentionDays = RETENTION_DAYS[plan] ?? 7

  // 보관 기간 필터 적용
  let query = supabase
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
    .limit(100)

  if (retentionDays !== null) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - retentionDays)
    query = query.gte('created_at', cutoff.toISOString())
  }

  const { data: projects } = await query

  return <HistoryClient projects={projects ?? []} plan={plan} retentionDays={retentionDays} />
}
