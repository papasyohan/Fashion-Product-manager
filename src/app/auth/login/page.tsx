'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Package, Loader2, ChevronDown } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmailForm, setShowEmailForm] = useState(false)

  // ─── Google OAuth ────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError('Google 로그인 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  // ─── 이메일/비밀번호 (보조 수단) ─────────────────────────────────────────
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }

    router.push('/studio')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen bg-stone-50 flex items-center justify-center px-4"
      style={{ fontFamily: "'Instrument Serif', 'Noto Serif KR', Georgia, serif" }}
    >
      <Card className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
        {/* 로고 */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-pink-500 flex items-center justify-center">
            <Package className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl tracking-tight">
            ProductCraft <span className="italic text-stone-500">AI</span>
          </span>
        </div>

        <h1 className="text-3xl tracking-tight mb-1">시작하기</h1>
        <p className="text-sm text-stone-500 font-sans mb-8">
          30초 만에 팔리는 상품 콘텐츠를 만들어보세요
        </p>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-sm font-sans text-red-700">
            {error}
          </div>
        )}

        {/* ── Google OAuth 버튼 (주요 CTA) ── */}
        <Button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full rounded-full bg-stone-900 text-white font-sans font-semibold hover:bg-stone-700 h-12 text-base mb-3"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 로그인 중...</>
          ) : (
            <>
              <GoogleIcon className="w-5 h-5 mr-2" />
              Google로 계속하기
            </>
          )}
        </Button>

        {/* ── 구분선 ── */}
        <div className="my-5 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs font-sans text-stone-400">
              또는 이메일로 로그인
            </span>
          </div>
        </div>

        {/* ── 이메일 폼 (토글) ── */}
        {!showEmailForm ? (
          <button
            onClick={() => setShowEmailForm(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-full border border-stone-300 text-sm font-sans text-stone-600 hover:border-stone-500 hover:text-stone-900 transition-colors"
          >
            이메일 / 비밀번호로 로그인
            <ChevronDown className="w-4 h-4" />
          </button>
        ) : (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="font-sans text-sm text-stone-700" htmlFor="email">
                이메일
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="rounded-xl font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-sans text-sm text-stone-700" htmlFor="password">
                비밀번호
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="rounded-xl font-sans"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-stone-900 text-white font-sans font-semibold hover:bg-stone-700"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 로그인 중...</>
              ) : (
                '이메일로 로그인'
              )}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm font-sans text-stone-500">
          계정이 없으신가요?{' '}
          <Link href="/auth/signup" className="text-stone-900 font-semibold hover:underline">
            무료로 시작하기
          </Link>
        </p>

        <p className="mt-3 text-center text-xs font-sans text-stone-400 leading-relaxed">
          계속하면{' '}
          <Link href="/terms" className="underline hover:text-stone-700">이용약관</Link>
          {' '}및{' '}
          <Link href="/privacy" className="underline hover:text-stone-700">개인정보처리방침</Link>
          에 동의하게 됩니다.
        </p>
      </Card>
    </div>
  )
}

// ─── Google 아이콘 ─────────────────────────────────────────────────────────

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
