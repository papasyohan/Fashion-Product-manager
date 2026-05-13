'use client'

import { useState } from 'react'
import { MessageSquare, Link2, Check, Share2, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── Props ──────────────────────────────────────────────────────────────────

interface ShareSheetProps {
  open: boolean
  onClose: () => void
  projectId: string
  productName: string
  tagline: string
  thumbnailUrl?: string
}

type ShareMethod = 'sms' | 'kakao' | 'link'

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function ShareSheet({
  open,
  onClose,
  projectId,
  productName,
  tagline,
  thumbnailUrl,
}: ShareSheetProps) {
  const [activeMethod, setActiveMethod] = useState<ShareMethod | null>(null)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${projectId}`

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleSMS = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'sms',
          projectId,
          phone,
          productName,
          tagline,
          shareUrl,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'SMS 발송 실패')
      }

      setSent(true)
      setTimeout(() => { setSent(false); setActiveMethod(null) }, 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : '발송 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleKakao = () => {
    if (typeof window !== 'undefined' && window.Kakao?.isInitialized()) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: productName,
          description: tagline,
          imageUrl: thumbnailUrl,
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
        buttons: [
          { title: '상품 보러가기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
        ],
      })
    } else {
      handleCopyLink()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-white overflow-hidden"
        style={{ border: '1px solid #e5e5e5' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 바 (모바일) */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#e5e5e5]" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid #e5e5e5' }}>
          <div>
            <h2 className="text-[18px] font-black text-[#111111]">공유하기</h2>
            <p className="text-[12px] text-[#9e9ea0] mt-0.5 truncate max-w-[220px]">
              {productName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f5f5f5] transition-colors"
          >
            <X className="w-4 h-4 text-[#707072]" strokeWidth={2.5} />
          </button>
        </div>

        {/* 공유 버튼 그리드 */}
        {!activeMethod && (
          <div
            className="grid grid-cols-3"
            style={{ borderBottom: '1px solid #e5e5e5' }}
          >
            <ShareButton
              icon={<MessageSquare className="w-5 h-5" />}
              label="문자"
              sublabel="CoolSMS"
              borderRight
              onClick={() => setActiveMethod('sms')}
            />
            <ShareButton
              icon={
                <div className="w-5 h-5 rounded-full bg-[#f5c430] flex items-center justify-center">
                  <span className="text-[10px] font-black text-[#111111]">K</span>
                </div>
              }
              label="카카오톡"
              sublabel="OG 카드"
              borderRight
              onClick={handleKakao}
            />
            <ShareButton
              icon={copied ? <Check className="w-5 h-5" style={{ color: '#007d48' }} /> : <Link2 className="w-5 h-5" />}
              label={copied ? '복사됨!' : '링크 복사'}
              sublabel="클립보드"
              onClick={handleCopyLink}
            />
          </div>
        )}

        {/* SMS 폼 */}
        {activeMethod === 'sms' && (
          <form onSubmit={handleSMS} className="px-6 py-5 space-y-4" style={{ borderBottom: '1px solid #e5e5e5' }}>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold text-[#111111]">휴대폰 번호</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                required
                autoFocus
                className="rounded-none border-[#cacacb] focus-visible:ring-0 focus-visible:border-[#111111] h-10 text-[13px]"
              />
            </div>
            {error && (
              <p className="text-[12px]" style={{ color: '#d30005' }}>{error}</p>
            )}
            {sent && (
              <p className="text-[12px] flex items-center gap-1" style={{ color: '#007d48' }}>
                <Check className="w-3.5 h-3.5" /> 문자 발송 완료!
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveMethod(null)}
                className="flex-1 rounded-full text-[13px] font-semibold border-[#cacacb] text-[#111111] hover:border-[#111111]"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-full bg-[#111111] text-white text-[13px] font-semibold hover:bg-[#333333]"
              >
                {loading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />발송 중</> : '발송'}
              </Button>
            </div>
          </form>
        )}

        {/* 링크 미리보기 */}
        <div className="px-6 py-3" style={{ backgroundColor: '#f5f5f5' }}>
          <div className="flex items-center gap-2">
            <Share2 className="w-3.5 h-3.5 text-[#9e9ea0] flex-shrink-0" />
            <p className="text-[11px] text-[#9e9ea0] truncate">{shareUrl}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 서브 컴포넌트 ──────────────────────────────────────────────────────────

function ShareButton({
  icon,
  label,
  sublabel,
  borderRight,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  sublabel?: string
  borderRight?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-5 hover:bg-[#f5f5f5] transition-colors"
      style={{
        backgroundColor: '#ffffff',
        borderRight: borderRight ? '1px solid #e5e5e5' : undefined,
      }}
    >
      <div className="text-[#111111]">{icon}</div>
      <div className="text-center">
        <div className="text-[13px] font-semibold text-[#111111]">{label}</div>
        {sublabel && <div className="text-[10px] text-[#9e9ea0]">{sublabel}</div>}
      </div>
    </button>
  )
}

// Kakao SDK 타입 확장은 src/components/kakao-sdk-loader에서 관리
