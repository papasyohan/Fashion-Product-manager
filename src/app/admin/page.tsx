/**
 * Admin 대시보드 — 핵심 지표 카드 그리드 + 최근 이벤트 / 가입 유저
 *
 * Server Component — RLS 우회용 admin 클라이언트로 v_admin_stats view + 최근 이벤트 조회.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { TrendingUp, Users, Sparkles, CreditCard } from 'lucide-react'

interface Stats {
  total_users: number
  new_users_7d: number
  active_users_7d: number
  generations_7d: number
  mrr: number
  free_users: number
  starter_users: number
  pro_users: number
  business_users: number
}

interface RecentEvent {
  id: string
  user_id: string
  event_type: string
  credits_used: number
  created_at: string
  metadata: Record<string, unknown> | null
}

interface RecentUser {
  id: string
  plan: string
  credits_left: number
  created_at: string
}

async function loadStats(): Promise<Stats | null> {
  const admin = await createAdminClient()
  const { data, error } = await admin.from('v_admin_stats').select('*').single()
  if (error) {
    console.error('[admin/dashboard] stats load failed:', error)
    return null
  }
  return data as Stats
}

async function loadRecentEvents(): Promise<RecentEvent[]> {
  const admin = await createAdminClient()
  const { data } = await admin
    .from('usage_events')
    .select('id, user_id, event_type, credits_used, created_at, metadata')
    .order('created_at', { ascending: false })
    .limit(20)
  return (data ?? []) as RecentEvent[]
}

async function loadRecentUsers(): Promise<RecentUser[]> {
  const admin = await createAdminClient()
  const { data } = await admin
    .from('user_profiles')
    .select('id, plan, credits_left, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  return (data ?? []) as RecentUser[]
}

export default async function AdminDashboard() {
  const [stats, events, users] = await Promise.all([
    loadStats(),
    loadRecentEvents(),
    loadRecentUsers(),
  ])

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#9e9ea0] mb-1">
          Overview
        </div>
        <h1 className="text-[28px] font-black text-[#111111]">대시보드</h1>
      </header>

      {/* 지표 카드 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 mb-10" style={{ border: '1px solid #e5e5e5' }}>
        <StatCard
          icon={Users}
          label="총 가입자"
          value={stats?.total_users ?? 0}
          delta={stats ? `+${stats.new_users_7d} 지난 7일` : undefined}
          borderRight
        />
        <StatCard
          icon={TrendingUp}
          label="활성 셀러 (7일)"
          value={stats?.active_users_7d ?? 0}
          borderRight
        />
        <StatCard
          icon={Sparkles}
          label="생성 (7일)"
          value={stats?.generations_7d ?? 0}
          borderRight
        />
        <StatCard
          icon={CreditCard}
          label="MRR"
          value={`₩${(stats?.mrr ?? 0).toLocaleString()}`}
        />
      </div>

      {/* 플랜 분포 */}
      <section className="mb-10">
        <SectionTitle>플랜 분포</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4" style={{ border: '1px solid #e5e5e5' }}>
          <PlanCell plan="Free"     count={stats?.free_users ?? 0}     borderRight />
          <PlanCell plan="Starter"  count={stats?.starter_users ?? 0}  borderRight />
          <PlanCell plan="Pro"      count={stats?.pro_users ?? 0}      borderRight  highlight />
          <PlanCell plan="Business" count={stats?.business_users ?? 0} />
        </div>
      </section>

      {/* 2단: 최근 가입 / 최근 이벤트 */}
      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <SectionTitle>최근 가입 유저 (10명)</SectionTitle>
          <div style={{ border: '1px solid #e5e5e5' }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #e5e5e5' }}>
                  <th className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#9e9ea0]">ID (앞 8자)</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#9e9ea0]">플랜</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#9e9ea0]">크레딧</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#9e9ea0]">가입일</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-[12px] text-[#9e9ea0]">데이터 없음</td></tr>
                ) : users.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid #f5f5f5' : undefined }}>
                    <td className="px-4 py-2 text-[12px] font-mono text-[#111111]">{u.id.slice(0, 8)}…</td>
                    <td className="px-4 py-2 text-[12px] text-[#111111] uppercase font-black tracking-wider">{u.plan}</td>
                    <td className="px-4 py-2 text-[12px] text-right text-[#111111] font-bold">{u.credits_left}</td>
                    <td className="px-4 py-2 text-[11px] text-right text-[#9e9ea0]">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <SectionTitle>최근 사용 이벤트 (20건)</SectionTitle>
          <div style={{ border: '1px solid #e5e5e5', maxHeight: '420px', overflowY: 'auto' }}>
            <table className="w-full">
              <thead className="sticky top-0">
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #e5e5e5' }}>
                  <th className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#9e9ea0]">유저</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#9e9ea0]">이벤트</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#9e9ea0]">크레딧</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#9e9ea0]">시각</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-[12px] text-[#9e9ea0]">데이터 없음</td></tr>
                ) : events.map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: i < events.length - 1 ? '1px solid #f5f5f5' : undefined }}>
                    <td className="px-4 py-2 text-[11px] font-mono text-[#111111]">{e.user_id.slice(0, 8)}…</td>
                    <td className="px-4 py-2 text-[11px] text-[#111111]">{eventLabel(e.event_type)}</td>
                    <td className="px-4 py-2 text-[11px] text-right font-bold" style={{ color: e.credits_used > 0 ? '#d30005' : '#007d48' }}>
                      {e.credits_used > 0 ? '-' : '+'}
                      {Math.abs(e.credits_used)}
                    </td>
                    <td className="px-4 py-2 text-[10px] text-right text-[#9e9ea0]">{formatDate(e.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

// ─── 서브 컴포넌트 ─────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, delta, borderRight,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  delta?: string
  borderRight?: boolean
}) {
  return (
    <div className="p-5 bg-white" style={{ borderRight: borderRight ? '1px solid #e5e5e5' : undefined }}>
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#9e9ea0] mb-2">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="text-[28px] font-black text-[#111111] tracking-tight">{value}</div>
      {delta && <div className="text-[11px] text-[#007d48] mt-1">{delta}</div>}
    </div>
  )
}

function PlanCell({ plan, count, borderRight, highlight }: { plan: string; count: number; borderRight?: boolean; highlight?: boolean }) {
  return (
    <div
      className="p-4"
      style={{
        borderRight: borderRight ? '1px solid #e5e5e5' : undefined,
        backgroundColor: highlight ? '#f5f5f5' : '#ffffff',
        borderTop: highlight ? '3px solid #111111' : '3px solid transparent',
      }}
    >
      <div className="text-[10px] font-black uppercase tracking-widest text-[#9e9ea0] mb-1.5">{plan}</div>
      <div className="text-[22px] font-black text-[#111111]">{count.toLocaleString()}</div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[16px] font-black text-[#111111] mb-3">{children}</h2>
  )
}

const EVENT_LABELS: Record<string, string> = {
  quick_generated: '간편 생성',
  studio_generated: '스튜디오 생성',
  thumbnail_generated: '썸네일',
  credit_purchased: '크레딧 충전',
  plan_upgraded: '플랜 업그레이드',
}

function eventLabel(t: string) {
  return EVENT_LABELS[t] ?? t
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
