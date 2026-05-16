'use client'

/**
 * IntentForm — v1.1 UX Customization L1 (Pre-Generation Intent)
 *
 * 업로드 직후 모드 선택 다음에 노출. 톤/타깃/채널 chip + 자유 메모.
 * 전부 선택사항. "건너뛰고 바로 생성" 큰 버튼 제공.
 *
 * Nike 디자인 시스템: 0px radius 컨테이너, hairline border, rounded-full chip
 */

import { useState } from 'react'
import { Sparkles, ChevronRight } from 'lucide-react'
import type { UserIntent } from '@/lib/ai/types'

interface IntentFormProps {
  initial?: UserIntent
  onSubmit: (intent: UserIntent) => void
  onSkip: () => void
  disabled?: boolean
}

const TONE_OPTIONS = [
  { value: 'casual',    label: '캐주얼' },
  { value: 'emotional', label: '감성' },
  { value: 'premium',   label: '프리미엄' },
  { value: 'witty',     label: '위트있게' },
] as const

const AUDIENCE_OPTIONS = [
  '20대 여성', '20대 남성', '30대 여성', '30대 남성',
  '40대 여성', '40대 남성', '시니어', '학생',
] as const

const CHANNEL_OPTIONS = [
  { value: 'naver',     label: '스마트스토어' },
  { value: 'coupang',   label: '쿠팡' },
  { value: 'musinsa',   label: '무신사' },
  { value: 'instagram', label: '인스타' },
] as const

export function IntentForm({ initial, onSubmit, onSkip, disabled }: IntentFormProps) {
  const [tone, setTone] = useState<string | undefined>(initial?.tone)
  const [audience, setAudience] = useState<string | undefined>(initial?.audience)
  const [channel, setChannel] = useState<string | undefined>(initial?.channel)
  const [memo, setMemo] = useState(initial?.memo ?? '')

  const hasAnyInput = !!(tone || audience || channel || memo.trim())

  const handleSubmit = () => {
    onSubmit({
      tone: tone || undefined,
      audience: audience || undefined,
      channel: channel || undefined,
      memo: memo.trim() || undefined,
    })
  }

  return (
    <div className="bg-white" style={{ border: '1px solid #e5e5e5' }}>
      {/* 헤더 */}
      <div className="px-6 md:px-8 py-5" style={{ borderBottom: '1px solid #e5e5e5' }}>
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="w-6 h-6 flex items-center justify-center"
            style={{ backgroundColor: '#111111' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#9e9ea0]">
            Step 02 · 의도 (선택)
          </span>
        </div>
        <h3 className="text-[22px] font-black text-[#111111]">
          어떤 느낌으로 만들까요?
          <span className="text-[#9e9ea0] font-normal italic text-[14px] ml-2">전부 선택사항</span>
        </h3>
        <p className="text-[13px] text-[#707072] mt-1.5">
          입력하시면 결과가 더 정확해져요. 건너뛰셔도 AI가 알아서 추천합니다.
        </p>
      </div>

      {/* 입력 */}
      <div className="px-6 md:px-8 py-6 space-y-6">
        {/* 톤 */}
        <Section label="톤 (분위기)">
          <ChipRow
            options={TONE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={tone}
            onChange={setTone}
            disabled={disabled}
          />
        </Section>

        {/* 타깃 */}
        <Section label="타깃 고객">
          <ChipRow
            options={AUDIENCE_OPTIONS.map((v) => ({ value: v, label: v }))}
            value={audience}
            onChange={setAudience}
            disabled={disabled}
          />
        </Section>

        {/* 채널 */}
        <Section label="판매 채널">
          <ChipRow
            options={CHANNEL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={channel}
            onChange={setChannel}
            disabled={disabled}
          />
        </Section>

        {/* 자유 메모 */}
        <Section label="한 줄 요청 (선택)">
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value.slice(0, 200))}
            disabled={disabled}
            placeholder="예: 여성용 입니다. 가볍고 보온성 강조 부탁드려요"
            rows={2}
            className="w-full p-3 text-[13px] text-[#111111] placeholder:text-[#9e9ea0] resize-none focus:outline-none"
            style={{ border: '1px solid #cacacb' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#111111')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#cacacb')}
          />
          <div className="flex justify-end mt-1.5">
            <span className="text-[11px] text-[#9e9ea0]">{memo.length}/200</span>
          </div>
        </Section>
      </div>

      {/* 액션 */}
      <div className="px-6 md:px-8 py-4 flex items-center justify-end gap-3" style={{ backgroundColor: '#f5f5f5', borderTop: '1px solid #e5e5e5' }}>
        <button
          type="button"
          onClick={onSkip}
          disabled={disabled}
          className="px-5 h-10 rounded-full text-[13px] font-semibold text-[#707072] hover:text-[#111111] transition-colors disabled:opacity-50"
        >
          건너뛰고 바로 생성 →
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled}
          className="px-5 h-10 rounded-full text-[13px] font-semibold text-white bg-[#111111] hover:bg-[#333333] transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {hasAnyInput ? '의도 반영해서 생성' : '바로 생성'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── 서브 컴포넌트 ──────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-black uppercase tracking-widest text-[#9e9ea0] mb-2">
        {label}
      </div>
      {children}
    </div>
  )
}

function ChipRow({
  options,
  value,
  onChange,
  disabled,
}: {
  options: ReadonlyArray<{ value: string; label: string }>
  value?: string
  onChange: (v: string | undefined) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(selected ? undefined : opt.value)}
            disabled={disabled}
            className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-colors disabled:opacity-50"
            style={{
              backgroundColor: selected ? '#111111' : '#ffffff',
              color: selected ? '#ffffff' : '#111111',
              border: `1px solid ${selected ? '#111111' : '#cacacb'}`,
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
