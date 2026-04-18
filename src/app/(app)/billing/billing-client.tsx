'use client'

import { useState } from 'react'
import { Check, Zap, Sparkles, Building2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── 플랜 정의 ────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '무료',
    credits: 3,
    period: '월',
    icon: null,
    color: 'stone',
    features: [
      '월 3크레딧 (체험)',
      '간편 모드 전용',
      '2K 해상도',
      '생성 내역 7일 보관',
    ],
    highlight: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 19900,
    priceLabel: '₩19,900',
    credits: 50,
    period: '월',
    icon: Zap,
    color: 'blue',
    features: [
      '월 50크레딧',
      '간편 + 스튜디오 모드',
      '최대 2K 해상도',
      '생성 내역 30일 보관',
      'SMS 공유 5건/월',
    ],
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49900,
    priceLabel: '₩49,900',
    credits: 200,
    period: '월',
    icon: Sparkles,
    color: 'violet',
    features: [
      '월 200크레딧',
      '간편 + 스튜디오 모드',
      '4K 해상도 (Nano Banana 2)',
      '생성 내역 무제한 보관',
      'SMS + 카카오 공유 무제한',
      '상세페이지 HTML 내보내기',
    ],
    highlight: true,
    badge: '인기',
  },
  {
    id: 'business',
    name: 'Business',
    price: 149000,
    priceLabel: '₩149,000',
    credits: 1000,
    period: '월',
    icon: Building2,
    color: 'amber',
    features: [
      '월 1,000크레딧',
      '모든 Pro 기능',
      '팀 계정 5명',
      'API 접근 권한',
      '전담 지원',
      '커스텀 브랜딩',
    ],
    highlight: false,
  },
]

const COLOR_MAP: Record<string, { badge: string; button: string; border: string; text: string }> = {
  stone:  { badge: 'bg-stone-100 text-stone-700',   button: 'bg-stone-200 text-stone-700 hover:bg-stone-300',      border: 'border-stone-200',  text: 'text-stone-700' },
  blue:   { badge: 'bg-blue-50 text-blue-700',       button: 'bg-blue-600 text-white hover:bg-blue-700',            border: 'border-blue-200',   text: 'text-blue-700' },
  violet: { badge: 'bg-violet-50 text-violet-700',   button: 'bg-violet-600 text-white hover:bg-violet-700',        border: 'border-violet-300', text: 'text-violet-700' },
  amber:  { badge: 'bg-amber-50 text-amber-700',     button: 'bg-amber-500 text-white hover:bg-amber-600',          border: 'border-amber-200',  text: 'text-amber-700' },
}

interface UsageEvent {
  event_type: string
  credits_used: number
  created_at: string
}

interface Props {
  currentPlan: string
  creditsLeft: number
  email: string
  usageEvents: UsageEvent[]
}

export function BillingClient({ currentPlan, creditsLeft, email, usageEvents }: Props) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free' || planId === currentPlan) return
    setLoadingPlan(planId)
    // TODO: Toss Payments 연동 — Sprint 3
    await new Promise((r) => setTimeout(r, 800))
    alert(`${planId} 플랜 결제 페이지는 Toss Payments 연동 후 활성화됩니다.`)
    setLoadingPlan(null)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const EVENT_LABELS: Record<string, string> = {
    quick_generated: '간편 모드 생성',
    studio_generated: '스튜디오 모드 생성',
    thumbnail_generated: '썸네일 생성',
    credit_purchased: '크레딧 충전',
    plan_upgraded: '플랜 업그레이드',
  }

  return (
    <div
      className="max-w-5xl mx-auto px-6 py-10"
      style={{ fontFamily: "'Instrument Serif', 'Noto Serif KR', Georgia, serif" }}
    >
      {/* 헤더 */}
      <div className="mb-10">
        <h1 className="text-4xl tracking-tight mb-2">
          플랜 &amp; 결제 <span className="italic text-stone-400">— {email}</span>
        </h1>
        <div className="flex items-center gap-3 mt-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-stone-100">
            <span className="text-sm font-sans text-stone-500">현재 플랜</span>
            <span className="font-semibold text-stone-900 capitalize">{currentPlan}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-stone-100">
            <span className="text-sm font-sans text-stone-500">잔여 크레딧</span>
            <span className="font-semibold text-stone-900">{creditsLeft}개</span>
          </div>
        </div>
      </div>

      {/* 플랜 그리드 */}
      <div className="grid md:grid-cols-4 gap-4 mb-12">
        {PLANS.map((plan) => {
          const isCurrentPlan = plan.id === currentPlan
          const colors = COLOR_MAP[plan.color]
          const Icon = plan.icon

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl border-2 p-6 flex flex-col
                ${plan.highlight ? `${colors.border} shadow-lg` : 'border-stone-200'}
              `}
            >
              {/* 인기 배지 */}
              {'badge' in plan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-violet-600 text-white text-[11px] font-sans font-bold">
                  {plan.badge}
                </div>
              )}

              {/* 플랜명 */}
              <div className="flex items-center gap-2 mb-4">
                {Icon && <Icon className={`w-5 h-5 ${colors.text}`} />}
                <span className={`text-sm font-sans font-bold ${colors.text}`}>
                  {plan.name}
                </span>
              </div>

              <div className="mb-1">
                <span className="text-3xl tracking-tight font-semibold">{plan.priceLabel}</span>
                {plan.price > 0 && (
                  <span className="text-xs font-sans text-stone-400 ml-1">/{plan.period}</span>
                )}
              </div>
              <p className="text-xs font-sans text-stone-500 mb-5">
                월 {plan.credits.toLocaleString()}크레딧
              </p>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-sans text-stone-600">
                    <Check className="w-3.5 h-3.5 mt-0.5 text-stone-400 flex-shrink-0" strokeWidth={2.5} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleUpgrade(plan.id)}
                disabled={isCurrentPlan || loadingPlan === plan.id}
                className={`w-full rounded-full text-sm font-sans font-semibold transition-colors ${colors.button} ${
                  isCurrentPlan ? 'opacity-60 cursor-default' : ''
                }`}
              >
                {isCurrentPlan
                  ? '현재 플랜'
                  : loadingPlan === plan.id
                  ? '처리중...'
                  : plan.price === 0
                  ? '무료 플랜'
                  : '업그레이드'}
                {!isCurrentPlan && plan.price > 0 && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          )
        })}
      </div>

      {/* 사용량 내역 */}
      <div>
        <h2 className="text-2xl tracking-tight mb-4">
          사용 내역 <span className="text-stone-400 italic text-lg">— 최근 20건</span>
        </h2>

        {usageEvents.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-stone-200">
            <p className="text-stone-400 font-sans text-sm">사용 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="text-left px-5 py-3 text-xs font-sans font-semibold text-stone-500 uppercase tracking-wider">항목</th>
                  <th className="text-right px-5 py-3 text-xs font-sans font-semibold text-stone-500 uppercase tracking-wider">크레딧</th>
                  <th className="text-right px-5 py-3 text-xs font-sans font-semibold text-stone-500 uppercase tracking-wider">일시</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {usageEvents.map((evt, i) => (
                  <tr key={i} className="hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-sans text-stone-700">
                      {EVENT_LABELS[evt.event_type] ?? evt.event_type}
                    </td>
                    <td className={`px-5 py-3 text-sm font-sans font-semibold text-right ${
                      evt.credits_used > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {evt.credits_used > 0 ? `-${evt.credits_used}` : `+${Math.abs(evt.credits_used)}`}
                    </td>
                    <td className="px-5 py-3 text-xs font-sans text-stone-400 text-right">
                      {formatDate(evt.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
