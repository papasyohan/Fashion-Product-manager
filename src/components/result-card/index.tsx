'use client'

import { useState } from 'react'
import { Check, Copy, Share2, MessageSquare } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ShareSheet } from '@/components/share-sheet'
import type { GenerationResult } from '@/store/studio'

interface ResultCardProps {
  result: GenerationResult
  mode: 'quick' | 'studio'
  projectId?: string | null
  onSelectName: (index: number) => void
  onRegenerate?: () => void
  onSave?: () => void
}

export function ResultCard({
  result,
  mode,
  projectId,
  onSelectName,
  onRegenerate,
  onSave,
}: ResultCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)

  const selectedName = result.names[result.selectedNameIndex]?.name ?? ''

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <div
      className="max-w-5xl mx-auto px-6 py-10"
      style={{ fontFamily: "'Instrument Serif', 'Noto Serif KR', Georgia, serif" }}
    >
      <div className="mb-8">
        <h1 className="text-4xl tracking-tight mb-2">
          생성 완료 <span className="italic text-stone-500">— 미리보기</span>
        </h1>
        <p className="text-sm text-stone-500 font-sans">
          아래 결과는 스마트스토어·쿠팡에 바로 복사해 사용할 수 있습니다.
        </p>
      </div>

      {/* 01: 상품명 3종 */}
      <section className="mb-8">
        <SectionHeader number="01" title="상품명 3종" subtitle="트렌드 반영" />
        <div className="grid md:grid-cols-3 gap-3">
          {result.names.map((n, i) => (
            <Card
              key={i}
              onClick={() => onSelectName(i)}
              data-testid="product-name-card"
              className={`rounded-2xl border-2 bg-white p-5 cursor-pointer transition-all hover:shadow-md ${
                result.selectedNameIndex === i
                  ? 'border-stone-900 shadow-md'
                  : 'border-stone-200 hover:border-stone-400'
              }`}
            >
              <div className="text-[11px] font-sans text-stone-400 mb-1">
                Option {i + 1}
                {result.selectedNameIndex === i && (
                  <Badge className="ml-2 bg-stone-900 text-white text-[10px] px-1.5 py-0">
                    선택됨
                  </Badge>
                )}
              </div>
              <div className="text-xl mb-3 leading-snug">{n.name}</div>
              <div className="text-xs font-sans text-stone-500">{n.trend}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* 02: 한줄 홍보문구 */}
      <section className="mb-8">
        <SectionHeader number="02" title="한줄 홍보문구" subtitle="35자 이내" />
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 border border-amber-200 p-8 relative group">
          <p className="text-3xl leading-tight tracking-tight">
            &ldquo;{result.tagline}&rdquo;
          </p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-sans text-stone-500">
              {result.tagline.length}자 · 검색 노출 최적화됨
            </span>
            <button
              onClick={() => copyToClipboard(result.tagline, 'tagline')}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-amber-100 text-stone-500"
            >
              {copiedField === 'tagline' ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* 03: 상세 설명 */}
      <section className="mb-8">
        <SectionHeader number="03" title="상세 설명" />
        <Card className="rounded-2xl border border-stone-200 bg-white p-6 relative group">
          <pre className="font-sans text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
            {result.description}
          </pre>
          <button
            onClick={() => copyToClipboard(result.description, 'description')}
            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-stone-100 text-stone-500"
          >
            {copiedField === 'description' ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </Card>
      </section>

      {/* 스튜디오 모드 전용: 공유 */}
      {mode === 'studio' && (
        <section className="mb-8">
          <SectionHeader number="04" title="공유하기" color="violet" />
          <div className="grid grid-cols-3 gap-3">
            <ShareButton
              icon={<MessageSquare className="w-5 h-5" />}
              label="SMS"
              onClick={() => setShareOpen(true)}
            />
            <ShareButton
              icon={
                <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold text-stone-900">K</div>
              }
              label="카카오톡"
              className="border-yellow-300 bg-yellow-50 hover:border-yellow-500"
              onClick={() => setShareOpen(true)}
            />
            <ShareButton
              icon={<Share2 className="w-5 h-5" />}
              label="링크 복사"
              onClick={() => setShareOpen(true)}
            />
          </div>
        </section>
      )}

      {/* ShareSheet 모달 */}
      {shareOpen && projectId && (
        <ShareSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          projectId={projectId}
          productName={selectedName}
          tagline={result.tagline}
        />
      )}

      {/* SynthID 고지 */}
      {mode === 'studio' && (
        <div className="mb-6 p-3 rounded-xl bg-stone-100 text-[11px] font-sans text-stone-500 leading-relaxed">
          <strong className="text-stone-700">고지:</strong> 스튜디오 모드로 생성된
          이미지는 Google SynthID 워터마크를 포함하며, AI 생성 콘텐츠임을 식별할 수 있습니다.
        </div>
      )}

      <Separator className="mb-6" />

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onRegenerate}
          className="px-5 rounded-full font-sans text-sm"
        >
          다시 생성
        </Button>
        <Button
          onClick={onSave}
          className="px-5 rounded-full bg-stone-900 text-white font-sans text-sm font-semibold"
        >
          저장하기
        </Button>
      </div>
    </div>
  )
}

// ─── 서브 컴포넌트 ─────────────────────────────────────────────────────────

function SectionHeader({
  number,
  title,
  subtitle,
  color = 'stone',
}: {
  number: string
  title: string
  subtitle?: string
  color?: 'stone' | 'violet'
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div
        className={`w-6 h-6 rounded-md text-white text-xs font-sans font-semibold flex items-center justify-center ${
          color === 'violet' ? 'bg-violet-600' : 'bg-stone-900'
        }`}
      >
        {number}
      </div>
      <h2 className="text-2xl tracking-tight">
        {title}
        {subtitle && (
          <span className="text-stone-400 italic text-lg ml-2">— {subtitle}</span>
        )}
      </h2>
    </div>
  )
}

function ShareButton({
  icon,
  label,
  className = '',
  onClick,
}: {
  icon: React.ReactNode
  label: string
  className?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border border-stone-200 bg-white p-5 hover:border-stone-900 transition-colors flex flex-col items-center gap-2 font-sans ${className}`}
    >
      {icon}
      <span className="text-sm font-semibold">{label}</span>
    </button>
  )
}
