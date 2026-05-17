import { createAdminClient } from '@/lib/supabase/server'
import { UsersTable } from '@/components/admin/users-table'

interface SearchParams {
  q?: string
  plan?: 'free' | 'starter' | 'pro' | 'business'
  showBanned?: string
}

interface UserRow {
  id: string
  plan: 'free' | 'starter' | 'pro' | 'business'
  credits_left: number
  role: 'user' | 'admin'
  banned_at: string | null
  created_at: string
  email: string | null
}

async function loadUsers(params: SearchParams): Promise<UserRow[]> {
  const admin = await createAdminClient()
  let query = admin
    .from('user_profiles')
    .select('id, plan, credits_left, role, banned_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (params.plan) query = query.eq('plan', params.plan)
  if (!params.showBanned) query = query.is('banned_at', null)

  const { data: profiles } = await query
  if (!profiles) return []

  // auth.users 에서 email 조회 (admin 권한 필요)
  const ids = profiles.map((p) => p.id)
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 200 })
  const emailMap = new Map<string, string | null>()
  for (const u of authUsers ?? []) emailMap.set(u.id, u.email ?? null)

  const rows: UserRow[] = profiles
    .map((p) => ({
      ...(p as Omit<UserRow, 'email'>),
      email: emailMap.get(p.id) ?? null,
    }))
    .filter((u) => {
      if (!params.q) return true
      const q = params.q.toLowerCase()
      return (u.email?.toLowerCase().includes(q) ?? false) || u.id.includes(q)
    })

  return rows.filter((r) => ids.includes(r.id))
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const users = await loadUsers(params)

  return (
    <div className="p-6 md:p-8">
      <header className="mb-6">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#9e9ea0] mb-1">
          User Management
        </div>
        <h1 className="text-[28px] font-black text-[#111111]">유저 관리</h1>
        <p className="text-[13px] text-[#707072] mt-1">
          이메일 검색 · 플랜 변경 · 크레딧 조정 · 계정 정지
        </p>
      </header>

      <UsersTable initial={users} />
    </div>
  )
}
