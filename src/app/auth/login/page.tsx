'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ChevronDown } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmailForm, setShowEmailForm] = useState(false)

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (oauthError) {
        setError(`Google 로그인 실패: ${oauthError.message}`)
        setLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google 로그인 실패')
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('로그인 요청이 응답하지 않습니다.')), 15000)
    )
    try {
      const supabase = createClient()
      const { error: loginError } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeout,
      ])
      if (loginError) {
        if (loginError.message.includes('Invalid login credentials')) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.')
        } else if (loginError.message.includes('Email not confirmed')) {
          setError('이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.')
        } else {
          setError(`로그인 실패: ${loginError.message}`)
        }
        setLoading(false)
        return
      }
      router.push('/studio')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4">

      {/* 카드 — 0px radius (Nike: card = rounded.none) */}
      <div
        className="w-full max-w-[400px] bg-white p-8 md:p-10"
        style={{ border: '1px solid #e5e5e5' }}
      >
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2 mb-10">
          <div className="w-7 h-7 rounded-full bg-[#111111] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[10px] font-black tracking-tight">PC</span>
          </div>
          <span className="text-[14px] font-bold text-[#111111] tracking-tight">
            ProductCraft AI
          </span>
        </Link>

        <h1 className="text-[28px] font-black text-[#111111] mb-1 leading-tight">
          시작하기
        </h1>
        <p className="text-[14px] text-[#707072] mb-8">
          30초 만에 팔리는 상품 콘텐츠를 만들어보세요
        </p>

        {/* 에러 */}
        {error && (
          <div
            className="mb-5 p-3 text-[13px] text-[#d30005]"
            style={{ backgroundColor: '#fff5f5', border: '1px solid #fecaca' }}
          >
            {error}
          </div>
        )}

        {/* Google 로그인 — button-primary */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full h-12 rounded-full bg-[#111111] text-white text-[14px] font-semibold flex items-center justify-center gap-2 mb-3 hover:bg-[#333] transition-colors disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> 로그인 중...</>
          ) : (
            <><GoogleIcon className="w-5 h-5" /> Google로 계속하기</>
          )}
        </button>

        {/* 구분선 */}
        <div className="my-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-[#e5e5e5]" />
          <span className="text-[12px] text-[#9e9ea0]">또는 이메일로 로그인</span>
          <div className="flex-1 h-px bg-[#e5e5e5]" />
        </div>

        {/* 이메일 폼 */}
        {!showEmailForm ? (
          <button
            onClick={() => setShowEmailForm(true)}
            className="w-full h-11 rounded-full border border-[#cacacb] text-[14px] text-[#707072] font-medium flex items-center justify-center gap-1.5 hover:border-[#111111] hover:text-[#111111] transition-colors"
          >
            이메일 / 비밀번호로 로그인
            <ChevronDown className="w-4 h-4" />
          </button>
        ) : (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold text-[#111111]" htmlFor="email">
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
                className="rounded-none border-[#cacacb] focus-visible:ring-0 focus-visible:border-[#111111] h-11 text-[14px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold text-[#111111]" htmlFor="password">
                비밀번호
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="rounded-none border-[#cacacb] focus-visible:ring-0 focus-visible:border-[#111111] h-11 text-[14px]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-[#111111] text-white text-[14px] font-semibold flex items-center justify-center gap-2 hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 로그인 중...</>
              ) : (
                '이메일로 로그인'
              )}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-[14px] text-[#707072]">
          계정이 없으신가요?{' '}
          <Link href="/auth/signup" className="text-[#111111] font-bold hover:underline">
            무료로 시작하기
          </Link>
        </p>
        <p className="mt-3 text-center text-[12px] text-[#9e9ea0] leading-relaxed">
          계속하면{' '}
          <Link href="/terms" className="underline hover:text-[#111111]">이용약관</Link>
          {' '}및{' '}
          <Link href="/privacy" className="underline hover:text-[#111111]">개인정보처리방침</Link>
          에 동의하게 됩니다.
        </p>
      </div>
    </div>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
