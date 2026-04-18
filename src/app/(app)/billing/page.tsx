import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BillingClient } from './billing-client'

export const metadata = {
  title: 'ProductCraft AI — 플랜·결제',
}

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan, credits_left, email')
    .eq('id', user.id)
    .single()

  const { data: usageEvents } = await supabase
    .from('usage_events')
    .select('event_type, credits_used, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <BillingClient
      currentPlan={(profile?.plan as string) ?? 'free'}
      creditsLeft={profile?.credits_left ?? 0}
      email={user.email ?? ''}
      usageEvents={usageEvents ?? []}
    />
  )
}
