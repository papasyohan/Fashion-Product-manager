'use client'

import { Zap, ArrowRight, X, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import type { CreditGuardResult } from '@/lib/credit-guard'

// ─── Plan 업그레이드 정보 ──────────────────────────────────────────────────

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '₩9,900',
    period: '/월',
    credits: 100,
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₩29,900',
    period: '/월',
    credits: 500,
    highlight: true,
    badge: '인기',
  },
  {
    id: 'business',
    name: 'Business',
    price: '₩79,900',
    period: '/월',
    credits: 2000,
    highlight: false,
  },
]

// ─── Props ──────────────────────────────────────────────────────────────────

interface CreditGuardModalProps {
  open: boolean
  onClose: () => void
  /** checkCreditGuard() 반환값 */
  guardResult: CreditGuardResult
  /** 크레딧 부족 vs 플랜 미달 구분 */
  reason: 'insufficient_credits' | 'plan_required'
  /** 현재 사용자 크레딧 */
  creditsLeft?: number
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────

export function CreditGuardModal({
  open,
  onClose,
  guardResult,
  reason,
  creditsLeft = 0,
}: CreditGuardModalProps) {
  if (!open) return null

  const isCreditsIssue = reason === 'insufficient_credits'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {/* Overlay + Panel */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 backdrop-blur-sm px-4"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          style={{ fontFamily: "'Instrument Serif', 'Noto Serif KR', Georgia, serif" }}
        >
          {/* 상단 그래디언트 배너 */}
          <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-pink-500 px-8 pt-8 pb-10">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                {isCreditsIssue ? (
                  <Zap className="w-6 h-6 text-white" strokeWidth={2} />
                ) : (
                  <CreditCard className="w-6 h-6 text-white" strokeWidth={2} />
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" strokeWidth={2.5} />
              </button>
            </div>

            <h2 className="text-3xl text-white tracking-tight">
              {isCreditsIssue ? '크레딧이 부족해요' : '플랜 업그레이드 필요'}
            </h2>
            <p className="mt-1 text-white/80 font-sans text-sm leading-relaxed">
              {isCreditsIssue
                ? `현재 잔여 크레딧: ${creditsLeft}개${guardResult.creditsRequired ? ` · 필요: ${guardResult.creditsRequired}개` : ''}`
                : guardResult.reason ?? '이 기능은 상위 플랜에서 이용할 수 있습니다.'}
            </p>
          </div>

          {/* 플랜 카드 */}
          <div className="px-8 pt-6 pb-4">
            <p className="text-xs font-sans uppercase tracking-widest text-stone-400 mb-4">
              플랜 선택
            </p>
            <div className="space-y-3">
              {PLANS.map((plan) => (
                <a
                  key={plan.id}
                  href="/billing"
                  className={`flex items-center justify-between rounded-2xl border-2 px-5 py-4 transition-all hover:shadow-md
                    ${plan.highlight
                      ? 'border-stone-900 bg-stone-50 shadow-sm'
                      : 'border-stone-200 hover:border-stone-400 bg-white'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-sans font-semibold text-stone-900 text-sm">
                          {plan.name}
                        </span>
                        {plan.badge && (
                          <span className="px-1.5 py-0.5 rounded-full bg-stone-900 text-white text-[10px] font-sans font-bold">
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-sans text-stone-500">
                        월 {plan.credits.toLocaleString()}크레딧
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl tracking-tight text-stone-900">{plan.price}</span>
                    <span className="text-xs font-sans text-stone-400">{plan.period}</span>
                    <ArrowRight className="w-4 h-4 text-stone-400 ml-1" />
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="px-8 pb-8 pt-4 flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-full font-sans border-stone-300 text-stone-600"
            >
              나중에
            </Button>
            <a
              href="/billing"
              className="flex-1 rounded-full bg-stone-900 text-white font-sans font-semibold hover:bg-stone-700 inline-flex items-center justify-center px-4 py-2 text-sm transition-colors"
            >
              플랜 업그레이드 <ArrowRight className="w-4 h-4 ml-1.5" />
            </a>
          </div>

          {/* 소액 크레딧 구매 링크 */}
          {isCreditsIssue && (
            <div className="border-t border-stone-100 px-8 py-4 text-center">
              <a
                href="/billing#topup"
                className="text-xs font-sans text-stone-500 hover:text-stone-900 underline transition-colors"
              >
                플랜 변경 없이 크레딧만 충전하기 →
              </a>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  )
}
