'use client'

import { Check, Zap, Wand2, ArrowRight } from 'lucide-react'
import type { StudioMode } from '@/store/studio'

const MODES = [
  {
    id: 'quick' as StudioMode,
    title: '간편 모드',
    subtitle: 'QUICK MODE',
    tag: '15~30초',
    icon: Zap,
    description: '사진 한 장으로 상품명·한줄카피·상세설명까지 30초 안에',
    features: [
      '트렌드 반영 상품명 3종',
      '35자 이내 한줄 홍보문구',
      '400~600자 상세 설명',
    ],
    badge: null,
    dark: false,
  },
  {
    id: 'studio' as StudioMode,
    title: '스튜디오 모드',
    subtitle: 'STUDIO MODE',
    tag: '1~3분 · Pro',
    icon: Wand2,
    description: '원본 제품을 유지한 채 합성·연출컷을 생성하고 상세페이지, 카톡 공유까지',
    features: [
      '간편 모드의 모든 산출물',
      'Nano Banana 2 · 2K~4K 썸네일 N장',
      '원본 제품 Subject Consistency 유지',
      '1:1·4:5·9:16 다중 비율 동시 생성',
      '상세페이지 자동 조립 + 카톡 공유',
    ],
    badge: '🍌 Powered by Nano Banana 2',
    dark: true,
  },
]

interface ModeSelectorProps {
  selectedMode: StudioMode | null
  onSelect: (mode: StudioMode) => void
  disabled?: boolean
}

export function ModeSelector({ selectedMode, onSelect, disabled = false }: ModeSelectorProps) {
  return (
    // Nike: 두 카드를 border 공유하는 연속 패널 구조, 0px radius
    <div
      className="grid md:grid-cols-2"
      style={{ border: '1px solid #e5e5e5' }}
    >
      {MODES.map((mode, idx) => {
        const Icon = mode.icon
        const isSelected = selectedMode === mode.id
        const isDark = mode.dark

        return (
          <button
            key={mode.id}
            onClick={() => !disabled && onSelect(mode.id)}
            disabled={disabled}
            aria-pressed={isSelected}
            className="relative text-left p-7 md:p-8 transition-colors"
            style={{
              backgroundColor: isDark ? '#111111' : isSelected ? '#f5f5f5' : '#ffffff',
              borderRight: idx === 0 ? '1px solid #e5e5e5' : undefined,
              borderTop: isSelected && !isDark ? '3px solid #111111' : '3px solid transparent',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {/* 헤더 */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  {/* 아이콘 — 0px radius, solid bg */}
                  <div
                    className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: isDark ? '#2a2a2a' : '#111111' }}
                  >
                    <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </div>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: isDark ? '#9e9ea0' : '#9e9ea0' }}
                  >
                    {mode.subtitle}
                  </span>
                </div>
                <h3
                  className="text-[22px] font-black"
                  style={{ color: isDark ? '#ffffff' : '#111111' }}
                >
                  {mode.title}
                </h3>
              </div>

              {/* 시간 태그 — pill */}
              <span
                className="text-[11px] font-semibold px-3 py-1 rounded-full flex-shrink-0"
                style={
                  isDark
                    ? { backgroundColor: '#2a2a2a', color: '#9e9ea0' }
                    : { backgroundColor: '#111111', color: '#ffffff' }
                }
              >
                {mode.tag}
              </span>
            </div>

            {/* Nano Banana 배지 */}
            {mode.badge && (
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-5 text-[11px] font-semibold"
                style={{ backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a', color: '#9e9ea0' }}
              >
                {mode.badge}
              </div>
            )}

            {/* 설명 */}
            <p
              className="text-[14px] leading-relaxed mb-5"
              style={{ color: isDark ? '#9e9ea0' : '#707072' }}
            >
              {mode.description}
            </p>

            {/* 기능 목록 */}
            <ul className="space-y-2.5 mb-6">
              {mode.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Check
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                    style={{ color: isDark ? '#ffffff' : '#111111' }}
                    strokeWidth={2.5}
                  />
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: isDark ? '#cacacb' : '#111111' }}
                  >
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div
              className="inline-flex items-center gap-2 text-[13px] font-semibold"
              style={{ color: isDark ? (isSelected ? '#ffffff' : '#9e9ea0') : (isSelected ? '#111111' : '#9e9ea0') }}
            >
              {isSelected ? '선택됨' : '이 모드로 시작하기'}
              <ArrowRight className="w-4 h-4" />
            </div>

            {/* 선택 인디케이터 */}
            {isSelected && (
              <div
                className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: isDark ? '#ffffff' : '#111111' }}
              >
                <Check
                  className="w-3.5 h-3.5"
                  style={{ color: isDark ? '#111111' : '#ffffff' }}
                  strokeWidth={3}
                />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
