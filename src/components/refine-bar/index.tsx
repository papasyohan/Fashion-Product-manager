'use client'

/**
 * RefineBar — v1.1 Phase 3 (L4-B)
 *
 * 결과 화면 하단 sticky bar.
 * 자연어 입력 + 적용 대상 섹션 multi-select 으로 한 번에 여러 섹션 재생성.
 * 잠긴(locks) 섹션은 자동으로 disabled.
 */

import { useState } from 'react'
import { Loader2, Sparkles, X, ChevronUp, ChevronDown } from 'lucide-react'
import type { SectionKind } from '@/store/studio'

interface RefineBarProps {
  /** 각 섹션이 잠겨있는지 — 잠긴 섹션은 체크박스 disabled */
  locks: Record<SectionKind, boolean>
  /** 선택된 섹션들에 동일 refinement 로 재생성 */
  onSubmit: (refinement: string, targets: SectionKind[]) => Promise<void>
}

const PRESET_HINTS = [
  '더 짧고 임팩트 있게',
  '30대 직장인 남성 타깃으로',
  '프리미엄 톤으로',
  '가성비 강조',
  '계절감 살려서',
]

export function RefineBar({ locks, onSubmit }: RefineBarProps) {
  const [text, setText] = useState('')
  const [targets, setTargets] = useState<Set<SectionKind>>(
    new Set(['naming', 'tagline', 'description'])
  )
  const [collapsed, setCollapsed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const allLocked = locks.naming && locks.tagline && locks.description

  const toggleTarget = (kind: SectionKind) => {
    if (locks[kind]) return
    const next = new Set(targets)
    if (next.has(kind)) next.delete(kind)
    else next.add(kind)
    setTargets(next)
  }

  const submit = async () => {
    const refined = text.trim()
    if (!refined) return
    // 잠긴 항목 제외
    const finalTargets = Array.from(targets).filter((k) => !locks[k])
    if (finalTargets.length === 0) return
    setSubmitting(true)
    try {
      await onSubmit(refined, finalTargets)
      setText('') // 성공 후 클리어
    } finally {
      setSubmitting(false)
    }
  }

  if (allLocked) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{ borderTop: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
    >
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-3">
        {/* 헤더 — 접기/펴기 토글 */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center gap-2 text-left mb-2"
        >
          <div
            className="w-6 h-6 flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#111111' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#9e9ea0]">
              Refine with AI
            </div>
            <div className="text-[13px] font-bold text-[#111111]">
              {collapsed
                ? '여러 결과를 한 번에 다듬기 ↑'
                : '이 결과를 어떻게 다듬을까요?'}
            </div>
          </div>
          {collapsed ? (
            <ChevronUp className="w-4 h-4 text-[#9e9ea0]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#9e9ea0]" />
          )}
        </button>

        {!collapsed && (
          <div className="space-y-2">
            {/* 자연어 입력 */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 300))}
              placeholder="예: 더 캐주얼하게 30대 남성 타깃으로 다시 만들어주세요"
              rows={2}
              disabled={submitting}
              className="w-full p-2.5 text-[13px] text-[#111111] placeholder:text-[#9e9ea0] leading-relaxed resize-none focus:outline-none"
              style={{ border: '1px solid #cacacb' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#111111')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#cacacb')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  submit()
                }
              }}
            />

            {/* 프리셋 힌트 */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_HINTS.map((h) => (
                <button
                  key={h}
                  onClick={() => setText((t) => (t ? `${t} · ${h}` : h))}
                  disabled={submitting}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium text-[#707072] hover:text-[#111111] hover:bg-[#f5f5f5] transition-colors disabled:opacity-50"
                  style={{ border: '1px solid #e5e5e5' }}
                >
                  + {h}
                </button>
              ))}
            </div>

            {/* 적용 대상 + 액션 */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#9e9ea0]">
                  적용
                </span>
                <TargetChip
                  label="상품명"
                  checked={targets.has('naming')}
                  locked={locks.naming}
                  onToggle={() => toggleTarget('naming')}
                />
                <TargetChip
                  label="카피"
                  checked={targets.has('tagline')}
                  locked={locks.tagline}
                  onToggle={() => toggleTarget('tagline')}
                />
                <TargetChip
                  label="설명"
                  checked={targets.has('description')}
                  locked={locks.description}
                  onToggle={() => toggleTarget('description')}
                />
              </div>
              <div className="flex items-center gap-2">
                {text && (
                  <button
                    onClick={() => setText('')}
                    disabled={submitting}
                    className="p-1.5 text-[#9e9ea0] hover:text-[#111111] transition-colors disabled:opacity-50"
                    title="입력 지우기"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={submit}
                  disabled={
                    submitting ||
                    !text.trim() ||
                    Array.from(targets).filter((k) => !locks[k]).length === 0
                  }
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-[12px] font-bold text-white bg-[#111111] hover:bg-[#333333] transition-colors disabled:opacity-40"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      다듬는 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      다듬기 (Cmd+Enter)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TargetChip({
  label,
  checked,
  locked,
  onToggle,
}: {
  label: string
  checked: boolean
  locked?: boolean
  onToggle: () => void
}) {
  if (locked) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
        style={{ backgroundColor: '#f5f5f5', color: '#9e9ea0', border: '1px solid #e5e5e5' }}
        title="잠금된 섹션 — 자동 제외"
      >
        🔒 {label}
      </span>
    )
  }
  return (
    <button
      onClick={onToggle}
      className="px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors"
      style={{
        backgroundColor: checked ? '#111111' : '#ffffff',
        color: checked ? '#ffffff' : '#111111',
        border: `1px solid ${checked ? '#111111' : '#cacacb'}`,
      }}
    >
      {checked ? '✓ ' : ''}
      {label}
    </button>
  )
}
