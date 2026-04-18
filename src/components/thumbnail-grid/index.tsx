'use client'

import { useState } from 'react'
import { Check, Download, RefreshCw, Loader2, ImageOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface ThumbnailItem {
  id?: string
  url: string
  width: number
  height: number
  aspectRatio: string
}

interface ThumbnailGridProps {
  thumbnails: ThumbnailItem[]
  isGenerating?: boolean
  onSelectPrimary?: (thumbnail: ThumbnailItem) => void
  onRegenerateMore?: () => void
  selectedId?: string
}

// ─── 종횡비 레이블 ────────────────────────────────────────────────────────────

const RATIO_LABELS: Record<string, { label: string; use: string }> = {
  '1:1':  { label: '1:1',   use: '인스타그램 피드' },
  '4:5':  { label: '4:5',   use: '인스타 세로형' },
  '9:16': { label: '9:16',  use: '스토리·릴스' },
  '16:9': { label: '16:9',  use: '유튜브·배너' },
  '3:4':  { label: '3:4',   use: '모바일 쇼핑' },
  '4:3':  { label: '4:3',   use: 'PC 쇼핑몰' },
  '21:9': { label: '21:9',  use: '와이드 배너' },
  '1:4':  { label: '1:4',   use: '세로 스트립' },
  '4:1':  { label: '4:1',   use: '가로 배너' },
}

// ─── 로딩 플레이스홀더 ────────────────────────────────────────────────────────

const PLACEHOLDER_RATIOS = ['1:1', '4:5', '9:16', '16:9']

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function ThumbnailGrid({
  thumbnails,
  isGenerating = false,
  onSelectPrimary,
  onRegenerateMore,
  selectedId,
}: ThumbnailGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const getKey = (t: ThumbnailItem, i: number) => t.id ?? `${t.aspectRatio}-${i}`

  return (
    <div
      className="space-y-4"
      style={{ fontFamily: "'Instrument Serif', 'Noto Serif KR', Georgia, serif" }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl tracking-tight">
            썸네일{' '}
            <span className="italic text-stone-400">— Nano Banana 2</span>
          </h3>
          <p className="text-xs font-sans text-stone-500 mt-0.5">
            {isGenerating
              ? '이미지를 생성하고 있습니다...'
              : `${thumbnails.length}장 생성 완료 · Google SynthID 워터마크 포함`}
          </p>
        </div>
        {!isGenerating && onRegenerateMore && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerateMore}
            className="rounded-full font-sans text-xs border-stone-300 gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            변형 더 생성
          </Button>
        )}
      </div>

      {/* 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isGenerating
          ? PLACEHOLDER_RATIOS.map((ratio) => (
              <PlaceholderCard key={ratio} ratio={ratio} />
            ))
          : thumbnails.map((thumb, i) => {
              const key = getKey(thumb, i)
              const isSelected = selectedId === key || (!selectedId && i === 0)
              const isHovered = hoveredId === key
              const meta = RATIO_LABELS[thumb.aspectRatio] ?? {
                label: thumb.aspectRatio,
                use: '커스텀',
              }

              return (
                <div
                  key={key}
                  className="group relative"
                  onMouseEnter={() => setHoveredId(key)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* 이미지 래퍼 */}
                  <div
                    className={`relative overflow-hidden rounded-2xl border-2 transition-all cursor-pointer
                      ${isSelected
                        ? 'border-stone-900 shadow-lg'
                        : 'border-stone-200 hover:border-stone-400 hover:shadow-md'}
                    `}
                    style={{
                      aspectRatio: thumb.aspectRatio.replace(':', '/'),
                      background: '#f5f5f0',
                    }}
                    onClick={() => onSelectPrimary?.(thumb)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumb.url}
                      alt={`${thumb.aspectRatio} 썸네일`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* 선택 오버레이 */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-stone-900 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </div>
                    )}

                    {/* 다운로드 버튼 (호버 시) */}
                    {isHovered && (
                      <a
                        href={thumb.url}
                        download={`thumbnail-${thumb.aspectRatio.replace(':', 'x')}.jpg`}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-stone-700" />
                      </a>
                    )}
                  </div>

                  {/* 메타 정보 */}
                  <div className="mt-1.5 px-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-sans font-semibold text-stone-700">
                        {meta.label}
                      </span>
                      <span className="text-[10px] font-sans text-stone-400">
                        {thumb.width}×{thumb.height}
                      </span>
                    </div>
                    <p className="text-[10px] font-sans text-stone-400">{meta.use}</p>
                  </div>
                </div>
              )
            })}
      </div>

      {/* SynthID 고지 */}
      {!isGenerating && thumbnails.length > 0 && (
        <div className="p-3 rounded-xl bg-stone-100 text-[11px] font-sans text-stone-500 leading-relaxed">
          <strong className="text-stone-700">고지:</strong> 위 이미지는 Google Gemini AI로
          생성되었으며 SynthID 워터마크가 포함됩니다. 상업적 이용 시 AI 생성 콘텐츠임을 명시해야
          합니다.
        </div>
      )}
    </div>
  )
}

// ─── 플레이스홀더 카드 ────────────────────────────────────────────────────────

function PlaceholderCard({ ratio }: { ratio: string }) {
  const meta = RATIO_LABELS[ratio] ?? { label: ratio, use: '' }

  return (
    <div className="group relative">
      <div
        className="relative overflow-hidden rounded-2xl border-2 border-stone-200 bg-stone-100 animate-pulse"
        style={{ aspectRatio: ratio.replace(':', '/') }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
          <span className="text-[10px] font-sans text-stone-400">생성 중...</span>
        </div>
      </div>
      <div className="mt-1.5 px-0.5">
        <span className="text-xs font-sans font-semibold text-stone-400">{meta.label}</span>
        <p className="text-[10px] font-sans text-stone-300">{meta.use}</p>
      </div>
    </div>
  )
}

// ─── 에러 상태 ────────────────────────────────────────────────────────────────

export function ThumbnailGridError({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center font-sans">
      <ImageOff className="w-8 h-8 text-red-400 mx-auto mb-3" />
      <p className="text-sm font-semibold text-red-700 mb-1">썸네일 생성 실패</p>
      <p className="text-xs text-red-500 mb-4">{message}</p>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="rounded-full text-xs border-red-300 text-red-700 hover:bg-red-100"
        >
          다시 시도
        </Button>
      )}
    </div>
  )
}
