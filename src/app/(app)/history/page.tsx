import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HistoryClient } from './history-client'

export const metadata = {
  title: 'ProductCraft AI — 히스토리',
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: projects } = await supabase
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

  return <HistoryClient projects={projects ?? []} />
}
