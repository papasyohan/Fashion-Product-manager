'use client'

/**
 * 플랜별 이미지 해상도 설정 폼
 * Admin 설정 페이지에서 사용
 */

import { useState, useTransition } from 'react'
import { Check, AlertCircle, Loader2 } from 'lucide-react'
import type { Plan, Resolution } from '@/lib/plan-settings-shared'
import { RESOLUTION_LABELS, PLAN_LABELS, RESOLUTIONS } from '@/lib/plan-settings-shared'

interface PlanRow {
  plan: Plan
  resolution: Resolution
  label: string
}

interface Props {
  initialRows: PlanRow[]
}

// 플랜별 배지 색상
const PLAN_BADGE_STYLE: Record<Plan, { bg: string; text: string }> = {
  free:     { bg: '#f5f5f5', text: '#707072' },
  starter:  { bg: '#e8f4fd', text: '#1a6fa8' },
  pro:      { bg: '#111111', text: '#ffffff' },
  business: { bg: '#7c3aed', text: '#ffffff' },
}

export function PlanResolutionForm({ initialRows }: Props) {
  const [rows, setRows] = useState<PlanRow[]>(initialRows)
  const [saved, setSaved] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const setResolution = (plan: Plan, resolution: Resolution) => {
    setSaved(false)
    setErrorMsg(null)
    setRows((prev) => prev.map((r) => r.plan === plan ? { ...r, resolution } : r))
  }

  const handleSave = () => {
    startTransition(async () => {
      setSaved(false)
      setErrorMsg(null)

      const plan_resolution = Object.fromEntries(rows.map((r) => [r.plan, r.resolution]))

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_resolution }),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error ?? '저장에 실패했습니다.')
      }
    })
  }

  return (
    <div>
      {/* 테이블 */}
      <div style={{ border: '1px solid #e5e5e5' }}>
        {/* 헤더 */}
        <div
          className="grid grid-cols-2 px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-[#707072]"
          style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #e5e5e5' }}
        >
          <span>플랜</span>
          <span>해상도</span>
        </div>

        {/* 행 */}
        {rows.map((row, idx) => {
          const badge = PLAN_BADGE_STYLE[row.plan]
          return (
            <div
              key={row.plan}
              className="grid grid-cols-2 items-center px-5 py-4"
              style={{ borderBottom: idx < rows.length - 1 ? '1px solid #e5e5e5' : 'none' }}
            >
              {/* 플랜 레이블 */}
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 text-[10px] font-black tracking-widest"
                  style={{ backgroundColor: badge.bg, color: badge.text }}
                >
                  {PLAN_LABELS[row.plan]}
                </span>
              </div>

              {/* 해상도 선택 */}
              <div className="flex items-center gap-2">
                {RESOLUTIONS.map((res) => (
                  <button
                    key={res}
                    onClick={() => setResolution(row.plan, res)}
                    className="px-3 py-1.5 text-[12px] font-semibold transition-all"
                    style={
                      row.resolution === res
                        ? { backgroundColor: '#111111', color: '#ffffff' }
                        : {
                            backgroundColor: '#ffffff',
                            color: '#707072',
                            border: '1px solid #e5e5e5',
                          }
                    }
                  >
                    {res}
                  </button>
                ))}
                <span className="text-[11px] text-[#9e9ea0] ml-1">
                  {RESOLUTION_LABELS[row.resolution]}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 저장 버튼 + 상태 */}
      <div className="flex items-center gap-4 mt-6">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 text-[13px] font-bold text-white bg-[#111111] hover:bg-[#333333] disabled:opacity-50 transition-colors"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending ? '저장 중...' : '설정 저장'}
        </button>

        {saved && (
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-green-700">
            <Check className="w-4 h-4" />
            저장되었습니다
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-red-600">
            <AlertCircle className="w-4 h-4" />
            {errorMsg}
          </div>
        )}
      </div>

      {/* 안내 메시지 */}
      <p className="mt-4 text-[12px] text-[#9e9ea0]">
        변경 사항은 저장 즉시 모든 신규 이미지 생성 요청에 적용됩니다.
        진행 중인 요청에는 영향을 주지 않습니다.
      </p>
    </div>
  )
}
