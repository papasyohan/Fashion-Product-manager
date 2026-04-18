'use client'

import { Check, Zap, Wand2, Clock, ArrowRight } from 'lucide-react'
import type { StudioMode } from '@/store/studio'

// ─── 모드 정의 ─────────────────────────────────────────────────────────────

const MODES = [
  {
    id: 'quick' as StudioMode,
    title: '간편 모드',
    subtitle: 'Quick Mode',
    tag: '15~30초',
    icon: Zap,
    gradient: 'from-amber-400 via-orange-400 to-pink-400',
    description: '사진 한 장으로 상품명·한줄카피·상세설명까지 30초 안에',
    features: [
      '트렌드 반영 상품명 3종',
      '35자 이내 한줄 홍보문구',
      '400~600자 상세 설명',
    ],
    badge: null,
  },
  {
    id: 'studio' as StudioMode,
    title: '스튜디오 모드',
    subtitle: 'Studio Mode',
    tag: '1~3분 · Pro',
    icon: Wand2,
    gradient: 'from-indigo-500 via-violet-500 to-fuchsia-500',
    description:
      '원본 제품을 유지한 채 합성·연출컷을 생성하고 상세페이지, 카톡 공유까지',
    features: [
      '간편 모드의 모든 산출물',
      'Nano Banana 2 · 2K~4K 썸네일 N장',
      '원본 제품 Subject Consistency 유지',
      '1:1·4:5·9:16 다중 비율 동시 생성',
      '상세페이지 자동 조립 + 카톡 공유',
    ],
    badge: '🍌 Powered by Nano Banana 2',
  },
]

// ─── Props ──────────────────────────────────────────────────────────────────

interface ModeSelectorProps {
  selectedMode: StudioMode | null
  onSelect: (mode: StudioMode) => void
  disabled?: boolean
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────

export function ModeSelector({ selectedMode, onSelect, disabled = false }: ModeSelectorProps) {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      {MODES.map((mode) => {
        const Icon = mode.icon
        const isSelected = selectedMode === mode.id

        return (
          <button
            key={mode.id}
            onClick={() => !disabled && onSelect(mode.id)}
            disabled={disabled}
            aria-pressed={isSelected}
            className={`group relative text-left rounded-3xl border-2 transition-all duration-300 overflow-hidden
              ${isSelected
                ? 'border-stone-900 shadow-2xl scale-[1.01]'
                : 'border-stone-200 hover:border-stone-400 hover:shadow-lg'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {/* 호버 오버레이 */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${mode.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
            />

            <div className="relative p-7">
              {/* 아이콘 + 시간 태그 */}
              <div className="flex items-start justify-between mb-5">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center shadow-sm`}
                >
                  <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-[11px] font-sans font-medium">
                  <Clock className="w-3 h-3" />
                  {mode.tag}
                </div>
              </div>

              {/* 제목 */}
              <div className="mb-1 flex items-baseline gap-2">
                <h3 className="text-3xl tracking-tight">{mode.title}</h3>
                <span className="text-xs text-stone-400 font-sans uppercase tracking-widest">
                  {mode.subtitle}
                </span>
              </div>

              {/* 설명 */}
              <p className="text-stone-600 text-sm mb-5 font-sans leading-relaxed">
                {mode.description}
              </p>

              {/* Nano Banana 배지 */}
              {mode.badge && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-5 rounded-full bg-yellow-50 border border-yellow-200 text-[11px] font-sans font-semibold text-yellow-900">
                  {mode.badge}
                </div>
              )}

              {/* 기능 목록 */}
              <ul className="space-y-2.5 mb-6">
                {mode.features.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm font-sans text-stone-700"
                  >
                    <Check
                      className="w-4 h-4 mt-0.5 text-stone-900 flex-shrink-0"
                      strokeWidth={2.5}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div
                className={`inline-flex items-center gap-2 text-sm font-sans font-semibold transition-colors
                  ${isSelected
                    ? 'text-stone-900'
                    : 'text-stone-400 group-hover:text-stone-700'}
                `}
              >
                {isSelected ? '선택됨' : '이 모드로 시작하기'}
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* 선택 체크 뱃지 */}
            {isSelected && (
              <div className="absolute top-5 right-5 w-6 h-6 rounded-full bg-stone-900 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
