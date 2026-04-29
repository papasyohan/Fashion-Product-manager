'use client'

import { useState } from 'react'
import { Check, Copy, Share2, MessageSquare, FileCode2, Download, Loader2, ExternalLink } from 'lucide-react'
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
  const [detailPageHtml, setDetailPageHtml] = useState<string | null>(null)
  const [generatingDetail, setGeneratingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const selectedName = result.names[result.selectedNameIndex]?.name ?? ''

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // ─── 상세페이지 HTML 생성 (G5) ──────────────────────────────────────────
  const handleGenerateDetailPage = async () => {
    if (!projectId) {
      setDetailError('projectId가 없습니다.')
      return
    }
    setGeneratingDetail(true)
    setDetailError(null)
    try {
      const res = await fetch('/api/generate/detail-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          productName: selectedName,
          tagline: result.tagline,
          description: result.description,
          category: result.category ?? '상품',
          keywords: result.keywords ?? [],
          features: result.features ?? [],
          thumbnailUrl: result.primaryThumbnailUrl,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? '상세페이지 생성 실패')
      }
      const { html } = await res.json()
      setDetailPageHtml(html)
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : '상세페이지 생성 실패')
    } finally {
      setGeneratingDetail(false)
    }
  }

  // 상세페이지 HTML 다운로드
  const handleDownloadDetailPage = () => {
    if (!detailPageHtml) return
    const blob = new Blob([detailPageHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const slug = selectedName.replace(/[^\w가-힣0-9]+/g, '-').replace(/^-|-$/g, '') || 'detail-page'
    a.href = url
    a.download = `${slug}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 새 창 미리보기
  const handlePreviewDetailPage = () => {
    if (!detailPageHtml) return
    const win = window.open('', '_blank', 'noopener,noreferrer')
    if (!win) return
    win.document.open()
    win.document.write(detailPageHtml)
    win.document.close()
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

      {/* 스튜디오 모드 전용: 상세페이지 HTML */}
      {mode === 'studio' && (
        <section className="mb-8">
          <SectionHeader number="04" title="상세페이지 HTML" subtitle="Pro+ 내보내기" color="violet" />
          {!detailPageHtml ? (
            <Card className="rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/50 p-8 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-violet-600 flex items-center justify-center mb-4">
                <FileCode2 className="w-6 h-6 text-white" />
              </div>
              <p className="text-lg mb-1">상품 상세페이지 자동 조립</p>
              <p className="text-sm font-sans text-stone-500 mb-5">
                Hero · 핵심 특징 · 상품 소개 · 키워드 · 리뷰 플레이스홀더까지 한 번에
              </p>
              <Button
                onClick={handleGenerateDetailPage}
                disabled={generatingDetail}
                className="rounded-full bg-violet-600 text-white font-sans text-sm font-semibold hover:bg-violet-700 px-6"
              >
                {generatingDetail ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> 조립 중...</>
                ) : (
                  <><FileCode2 className="w-4 h-4 mr-1.5" /> 상세페이지 생성</>
                )}
              </Button>
              {detailError && (
                <p className="mt-3 text-xs font-sans text-red-600">{detailError}</p>
              )}
            </Card>
          ) : (
            <Card className="rounded-2xl border border-violet-200 bg-white overflow-hidden">
              <iframe
                title="상세페이지 미리보기"
                srcDoc={detailPageHtml}
                sandbox="allow-same-origin"
                className="w-full h-[420px] bg-white border-b border-stone-100"
              />
              <div className="flex items-center justify-between p-4 bg-violet-50/40">
                <span className="text-xs font-sans text-stone-500">
                  상세페이지 HTML이 준비되었습니다 · {Math.round(detailPageHtml.length / 1024)}KB
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handlePreviewDetailPage}
                    className="rounded-full font-sans text-xs border-violet-300 text-violet-700 hover:bg-violet-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> 새 창 열기
                  </Button>
                  <Button
                    onClick={handleDownloadDetailPage}
                    className="rounded-full bg-violet-600 text-white font-sans text-xs font-semibold hover:bg-violet-700"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> HTML 다운로드
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </section>
      )}

      {/* 스튜디오 모드 전용: 공유 */}
      {mode === 'studio' && (
        <section className="mb-8">
          <SectionHeader number="05" title="공유하기" color="violet" />
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
