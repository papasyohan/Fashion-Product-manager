'use client'

/**
 * VariantsTray — v1.1 Phase 2 (L5)
 *
 * 결과 섹션 헤더 아래 가로 chip 행. 1차 / 2차 / 3차 … 클릭으로 활성 변형 전환.
 * 1차만 있으면 숨김 (UI 노이즈 회피).
 */

import { Lock } from 'lucide-react'

interface VariantsTrayProps {
  count: number
  activeIndex: number
  refinements: Array<string | undefined>
  onSelect: (index: number) => void
  locked?: boolean
}

export function VariantsTray({ count, activeIndex, refinements, onSelect, locked }: VariantsTrayProps) {
  if (count <= 1) return null

  return (
    <div className="mb-3 flex items-center gap-1.5 flex-wrap">
      {locked && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest"
          style={{ backgroundColor: '#f5f5f5', color: '#9e9ea0', border: '1px solid #e5e5e5' }}
          title="잠금됨 — 재생성 불가"
        >
          <Lock className="w-2.5 h-2.5" /> 잠금
        </span>
      )}
      <span className="text-[10px] font-black uppercase tracking-widest text-[#9e9ea0]">
        변형
      </span>
      {Array.from({ length: count }).map((_, i) => {
        const isActive = i === activeIndex
        const refinement = refinements[i]
        const label = `${i + 1}차`
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            title={refinement ?? '같은 의도로 생성'}
            className="px-3 py-1 rounded-full text-[11px] font-semibold transition-colors"
            style={{
              backgroundColor: isActive ? '#111111' : '#ffffff',
              color: isActive ? '#ffffff' : '#111111',
              border: `1px solid ${isActive ? '#111111' : '#e5e5e5'}`,
            }}
          >
            {label}
            {refinement && !isActive && (
              <span className="ml-1 text-[#9e9ea0]">·</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
