'use client'

import { useState } from 'react'
import { Check, Copy, Share2, MessageSquare, FileCode2, Download, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShareSheet } from '@/components/share-sheet'
import { ThumbnailGrid, type ThumbnailItem } from '@/components/thumbnail-grid'
import { EditableText } from '@/components/editable-text'
import { RegenerateMenu } from '@/components/regenerate-menu'
import type { GenerationResult } from '@/store/studio'

interface ResultCardProps {
  result: GenerationResult
  mode: 'quick' | 'studio'
  projectId?: string | null
  onSelectName: (index: number) => void
  onRegenerate?: () => void
  onSave?: () => void

  // v1.1 — 인라인 편집 + 부분 재생성 핸들러 (모두 선택. 미전달 시 해당 기능 비활성)
  onEditName?: (index: number, newName: string) => void
  onEditTagline?: (newTagline: string) => void
  onEditDescription?: (newDescription: string) => void
  onRegenerateNaming?: (refinement?: string) => Promise<void>
  onRegenerateTagline?: (refinement?: string) => Promise<void>
  onRegenerateDescription?: (refinement?: string) => Promise<void>
}

export function ResultCard({
  result,
  mode,
  projectId,
  onSelectName,
  onRegenerate,
  onSave,
  onEditName,
  onEditTagline,
  onEditDescription,
  onRegenerateNaming,
  onRegenerateTagline,
  onRegenerateDescription,
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

  const handlePreviewDetailPage = () => {
    if (!detailPageHtml) return
    const win = window.open('', '_blank', 'noopener,noreferrer')
    if (!win) return
    win.document.open()
    win.document.write(detailPageHtml)
    win.document.close()
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-[28px] font-black text-[#111111] mb-2">
          생성 완료
          <span className="text-[#9e9ea0] font-medium text-[20px] ml-3">— 미리보기</span>
        </h1>
        <p className="text-[13px] text-[#707072]">
          아래 결과는 스마트스토어·쿠팡에 바로 복사해 사용할 수 있습니다.
        </p>
      </div>

      {/* 01: 상품명 3종 */}
      <section className="mb-8">
        <SectionHeader
          number="01"
          title="상품명 3종"
          subtitle="트렌드 반영"
          action={onRegenerateNaming ? (
            <RegenerateMenu section="상품명" onRegenerate={onRegenerateNaming} />
          ) : undefined}
        />
        <div
          className="grid md:grid-cols-3"
          style={{ border: '1px solid #e5e5e5' }}
        >
          {result.names.map((n, i) => {
            const isSelected = result.selectedNameIndex === i
            return (
              <div
                key={i}
                data-testid="product-name-card"
                onClick={() => onSelectName(i)}
                className="text-left p-5 transition-colors cursor-pointer hover:bg-[#f5f5f5]"
                style={{
                  backgroundColor: isSelected ? '#f5f5f5' : '#ffffff',
                  borderRight: i < result.names.length - 1 ? '1px solid #e5e5e5' : undefined,
                  borderTop: isSelected ? '3px solid #111111' : '3px solid transparent',
                }}
              >
                <div className="text-[11px] font-semibold text-[#9e9ea0] uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  Option {i + 1}
                  {isSelected && (
                    <span className="px-1.5 py-0.5 bg-[#111111] text-white text-[9px] font-black tracking-widest">
                      선택됨
                    </span>
                  )}
                </div>
                {/* 클릭 = 편집. onEditName 미전달 시 read-only */}
                <div
                  className="mb-2 leading-snug"
                  onClick={(e) => onEditName && e.stopPropagation()}
                >
                  {onEditName ? (
                    <EditableText
                      value={n.name}
                      onSave={(v) => onEditName(i, v)}
                      maxLength={40}
                      className="text-[18px] font-bold text-[#111111] block"
                      placeholder="상품명을 입력하세요"
                      showEditIcon={false}
                    />
                  ) : (
                    <div className="text-[18px] font-bold text-[#111111]">{n.name}</div>
                  )}
                </div>
                <div className="text-[12px] text-[#707072]">{n.trend}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 02: 한줄 홍보문구 */}
      <section className="mb-8">
        <SectionHeader
          number="02"
          title="한줄 홍보문구"
          subtitle="35자 이내"
          action={onRegenerateTagline ? (
            <RegenerateMenu section="홍보문구" onRegenerate={onRegenerateTagline} />
          ) : undefined}
        />
        <div
          className="p-8 relative group"
          style={{ backgroundColor: '#111111' }}
        >
          {onEditTagline ? (
            <div className="text-[28px] font-black text-white leading-tight tracking-tight">
              <span className="text-white">&ldquo;</span>
              <span className="inline-block">
                <EditableText
                  value={result.tagline}
                  onSave={onEditTagline}
                  maxLength={35}
                  className="text-[28px] font-black text-white leading-tight tracking-tight"
                  placeholder="홍보문구"
                  showEditIcon={false}
                />
              </span>
              <span className="text-white">&rdquo;</span>
            </div>
          ) : (
            <p className="text-[28px] font-black text-white leading-tight tracking-tight">
              &ldquo;{result.tagline}&rdquo;
            </p>
          )}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[12px] text-[#9e9ea0]">
              {result.tagline.length}자 · 검색 노출 최적화됨
            </span>
            <button
              onClick={() => copyToClipboard(result.tagline, 'tagline')}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-[#1c1c1c] text-[#9e9ea0] hover:text-white"
            >
              {copiedField === 'tagline' ? (
                <Check className="w-4 h-4" style={{ color: '#007d48' }} />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* 03: 상세 설명 */}
      <section className="mb-8">
        <SectionHeader
          number="03"
          title="상세 설명"
          action={onRegenerateDescription ? (
            <RegenerateMenu section="상세 설명" onRegenerate={onRegenerateDescription} />
          ) : undefined}
        />
        <div
          className="p-6 relative group"
          style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
        >
          {onEditDescription ? (
            <EditableText
              value={result.description}
              onSave={onEditDescription}
              multiline
              maxLength={800}
              className="text-[13px] text-[#111111] leading-relaxed whitespace-pre-wrap block"
              placeholder="상세 설명을 입력하세요"
              showEditIcon={false}
            />
          ) : (
            <pre className="text-[13px] text-[#111111] leading-relaxed whitespace-pre-wrap font-sans">
              {result.description}
            </pre>
          )}
          <button
            onClick={() => copyToClipboard(result.description, 'description')}
            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-[#f5f5f5] text-[#9e9ea0] hover:text-[#111111]"
          >
            {copiedField === 'description' ? (
              <Check className="w-4 h-4" style={{ color: '#007d48' }} />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </section>

      {/* 스튜디오 모드 전용: 썸네일 */}
      {mode === 'studio' && result.thumbnails && result.thumbnails.length > 0 && (
        <section className="mb-8">
          <SectionHeader number="04" title="썸네일" subtitle="Nano Banana 2" />
          <ThumbnailGrid
            thumbnails={result.thumbnails
              .filter((t): t is typeof t & { url: string } => !!t.url)
              .map<ThumbnailItem>((t) => ({
                url: t.url,
                width: t.width ?? 0,
                height: t.height ?? 0,
                aspectRatio: t.ratio,
              }))}
            onSelectPrimary={(thumb) => {
              void thumb
            }}
          />
        </section>
      )}

      {/* 스튜디오 모드 전용: 상세페이지 HTML */}
      {mode === 'studio' && (
        <section className="mb-8">
          <SectionHeader number="05" title="상세페이지 HTML" subtitle="Pro+ 내보내기" />
          {!detailPageHtml ? (
            <div
              className="p-8 text-center"
              style={{ border: '2px dashed #e5e5e5', backgroundColor: '#f5f5f5' }}
            >
              <div
                className="w-12 h-12 mx-auto flex items-center justify-center mb-4"
                style={{ backgroundColor: '#111111' }}
              >
                <FileCode2 className="w-6 h-6 text-white" />
              </div>
              <p className="text-[15px] font-semibold text-[#111111] mb-1">상품 상세페이지 자동 조립</p>
              <p className="text-[13px] text-[#707072] mb-5">
                Hero · 핵심 특징 · 상품 소개 · 키워드 · 리뷰 플레이스홀더까지 한 번에
              </p>
              <Button
                onClick={handleGenerateDetailPage}
                disabled={generatingDetail}
                className="rounded-full bg-[#111111] text-white text-[13px] font-semibold hover:bg-[#333333] px-6"
              >
                {generatingDetail ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> 조립 중...</>
                ) : (
                  <><FileCode2 className="w-4 h-4 mr-1.5" /> 상세페이지 생성</>
                )}
              </Button>
              {detailError && (
                <p className="mt-3 text-[12px]" style={{ color: '#d30005' }}>{detailError}</p>
              )}
            </div>
          ) : (
            <div style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff', overflow: 'hidden' }}>
              <iframe
                title="상세페이지 미리보기"
                srcDoc={detailPageHtml}
                sandbox="allow-same-origin"
                className="w-full h-[420px] bg-white"
                style={{ borderBottom: '1px solid #e5e5e5' }}
              />
              <div className="flex items-center justify-between p-4" style={{ backgroundColor: '#f5f5f5' }}>
                <span className="text-[12px] text-[#707072]">
                  상세페이지 HTML이 준비되었습니다 · {Math.round(detailPageHtml.length / 1024)}KB
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handlePreviewDetailPage}
                    className="rounded-full text-[12px] border-[#cacacb] text-[#111111] hover:border-[#111111]"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> 새 창 열기
                  </Button>
                  <Button
                    onClick={handleDownloadDetailPage}
                    className="rounded-full bg-[#111111] text-white text-[12px] font-semibold hover:bg-[#333333]"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> HTML 다운로드
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 스튜디오 모드 전용: 공유 */}
      {mode === 'studio' && (
        <section className="mb-8">
          <SectionHeader number="06" title="공유하기" />
          <div
            className="grid grid-cols-3"
            style={{ border: '1px solid #e5e5e5' }}
          >
            <ShareButton
              icon={<MessageSquare className="w-5 h-5" />}
              label="SMS"
              borderRight
              onClick={() => setShareOpen(true)}
            />
            <ShareButton
              icon={
                <div className="w-6 h-6 rounded-full bg-[#f5c430] flex items-center justify-center text-[11px] font-black text-[#111111]">K</div>
              }
              label="카카오톡"
              borderRight
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
        <div
          className="mb-6 p-3 text-[11px] text-[#707072] leading-relaxed"
          style={{ backgroundColor: '#f5f5f5', border: '1px solid #e5e5e5' }}
        >
          <strong className="text-[#111111]">고지:</strong> 스튜디오 모드로 생성된
          이미지는 Google SynthID 워터마크를 포함하며, AI 생성 콘텐츠임을 식별할 수 있습니다.
        </div>
      )}

      <div className="h-px bg-[#e5e5e5] mb-6" />

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onRegenerate}
          className="px-5 rounded-full text-[13px] font-semibold border-[#cacacb] text-[#111111] hover:border-[#111111]"
        >
          다시 생성
        </Button>
        <Button
          onClick={onSave}
          className="px-5 rounded-full bg-[#111111] text-white text-[13px] font-semibold hover:bg-[#333333]"
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
  action,
}: {
  number: string
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div
        className="w-6 h-6 text-white text-[11px] font-black flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: '#111111' }}
      >
        {number}
      </div>
      <h2 className="text-[20px] font-black text-[#111111] flex-1">
        {title}
        {subtitle && (
          <span className="text-[#9e9ea0] font-medium text-[14px] ml-2">— {subtitle}</span>
        )}
      </h2>
      {action}
    </div>
  )
}

function ShareButton({
  icon,
  label,
  borderRight,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  borderRight?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="p-5 hover:bg-[#f5f5f5] transition-colors flex flex-col items-center gap-2"
      style={{
        backgroundColor: '#ffffff',
        borderRight: borderRight ? '1px solid #e5e5e5' : undefined,
      }}
    >
      <div className="text-[#111111]">{icon}</div>
      <span className="text-[13px] font-semibold text-[#111111]">{label}</span>
    </button>
  )
}
