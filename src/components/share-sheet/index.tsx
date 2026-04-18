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
    // Kakao SDK가 로드된 경우만 동작
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
      // Fallback: 클립보드 복사
      handleCopyLink()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-stone-950/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-t-3xl md:rounded-3xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "'Instrument Serif', 'Noto Serif KR', Georgia, serif" }}
      >
        {/* 핸들 바 (모바일) */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-300" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div>
            <h2 className="text-2xl tracking-tight">공유하기</h2>
            <p className="text-xs font-sans text-stone-500 mt-0.5 truncate max-w-[220px]">
              {productName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-stone-600" strokeWidth={2.5} />
          </button>
        </div>

        {/* 공유 버튼 그리드 */}
        {!activeMethod && (
          <div className="px-6 pb-6 grid grid-cols-3 gap-3">
            <ShareButton
              icon={<MessageSquare className="w-6 h-6" />}
              label="문자"
              sublabel="CoolSMS"
              onClick={() => setActiveMethod('sms')}
            />
            <ShareButton
              icon={
                <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                  <span className="text-xs font-bold text-stone-900">K</span>
                </div>
              }
              label="카카오톡"
              sublabel="OG 카드"
              onClick={handleKakao}
              className="border-yellow-200 hover:border-yellow-400"
            />
            <ShareButton
              icon={copied ? <Check className="w-6 h-6 text-green-600" /> : <Link2 className="w-6 h-6" />}
              label={copied ? '복사됨!' : '링크 복사'}
              sublabel="클립보드"
              onClick={handleCopyLink}
            />
          </div>
        )}

        {/* SMS 폼 */}
        {activeMethod === 'sms' && (
          <form onSubmit={handleSMS} className="px-6 pb-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="font-sans text-sm text-stone-700">휴대폰 번호</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                required
                autoFocus
                className="rounded-xl font-sans"
              />
            </div>
            {error && (
              <p className="text-xs font-sans text-red-600">{error}</p>
            )}
            {sent && (
              <p className="text-xs font-sans text-green-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> 문자 발송 완료!
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveMethod(null)}
                className="flex-1 rounded-full font-sans text-sm"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-full bg-stone-900 text-white font-sans text-sm font-semibold"
              >
                {loading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />발송 중</> : '발송'}
              </Button>
            </div>
          </form>
        )}

        {/* 링크 미리보기 */}
        <div className="border-t border-stone-100 px-6 py-4 bg-stone-50">
          <div className="flex items-center gap-2">
            <Share2 className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
            <p className="text-[11px] font-sans text-stone-400 truncate">{shareUrl}</p>
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
  onClick,
  className = '',
}: {
  icon: React.ReactNode
  label: string
  sublabel?: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border border-stone-200 bg-white hover:border-stone-900 hover:shadow-sm transition-all font-sans ${className}`}
    >
      {icon}
      <div className="text-center">
        <div className="text-sm font-semibold text-stone-900">{label}</div>
        {sublabel && <div className="text-[10px] text-stone-400">{sublabel}</div>}
      </div>
    </button>
  )
}

// Kakao SDK 타입 확장
declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean
      Share: {
        sendDefault: (params: object) => void
      }
    }
  }
}
