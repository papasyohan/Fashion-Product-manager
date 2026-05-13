'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Check } from 'lucide-react'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const passwordsMatch = password === passwordConfirm && passwordConfirm.length > 0
  const passwordLongEnough = password.length >= 8

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!passwordLongEnough) { setError('비밀번호는 8자 이상이어야 합니다.'); return }
    if (!passwordsMatch) { setError('비밀번호가 일치하지 않습니다.'); return }
    setLoading(true)
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('회원가입 요청이 응답하지 않습니다.')), 15000)
    )
    try {
      const supabase = createClient()
      const result = await Promise.race([
        supabase.auth.signUp({
          email, password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        }),
        timeout,
      ])
      const { data, error: signupError } = result
      if (signupError) {
        if (signupError.message.includes('already registered')) {
          setError('이미 가입된 이메일입니다. 로그인 페이지를 이용해주세요.')
        } else if (signupError.message.includes('Email signups are disabled')) {
          setError('이메일 회원가입이 비활성화되어 있습니다.')
        } else {
          setError(`회원가입 실패: ${signupError.message}`)
        }
        return
      }
      if (data.session) { router.push('/studio'); router.refresh(); return }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (oauthError) { setError(`Google 로그인 실패: ${oauthError.message}`); setLoading(false) }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google 로그인 실패')
      setLoading(false)
    }
  }

  // ── 이메일 인증 완료 화면 ────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4">
        <div
          className="w-full max-w-[400px] bg-white p-10 text-center"
          style={{ border: '1px solid #e5e5e5' }}
        >
          <div className="w-12 h-12 mx-auto rounded-full bg-[#111111] flex items-center justify-center mb-6">
            <Check className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-[24px] font-black text-[#111111] mb-2">이메일을 확인해주세요</h1>
          <p className="text-[14px] text-[#707072] leading-relaxed mb-8">
            <strong className="text-[#111111]">{email}</strong>로 인증 메일을 발송했습니다.
            <br />메일함을 확인하고 링크를 클릭하면 가입이 완료됩니다.
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full h-11 rounded-full border border-[#cacacb] text-[14px] font-semibold text-[#111111] hover:border-[#111111] transition-colors"
          >
            로그인 페이지로
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4 py-12">

      {/* 카드 — 0px radius */}
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

        <h1 className="text-[28px] font-black text-[#111111] mb-1 leading-tight">회원가입</h1>
        <p className="text-[14px] text-[#707072] mb-8">30초 만에 시작하는 AI 상품 콘텐츠</p>

        {/* 에러 */}
        {error && (
          <div
            className="mb-5 p-3 text-[13px] text-[#d30005]"
            style={{ backgroundColor: '#fff5f5', border: '1px solid #fecaca' }}
          >
            {error}
          </div>
        )}

        {/* 이메일 폼 */}
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold text-[#111111]" htmlFor="name">이름</Label>
            <Input
              id="name" type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동" required
              className="rounded-none border-[#cacacb] focus-visible:ring-0 focus-visible:border-[#111111] h-11 text-[14px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold text-[#111111]" htmlFor="email">이메일</Label>
            <Input
              id="email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" required
              className="rounded-none border-[#cacacb] focus-visible:ring-0 focus-visible:border-[#111111] h-11 text-[14px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold text-[#111111]" htmlFor="password">비밀번호</Label>
            <Input
              id="password" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8자 이상" required minLength={8}
              className="rounded-none border-[#cacacb] focus-visible:ring-0 focus-visible:border-[#111111] h-11 text-[14px]"
            />
            {password.length > 0 && (
              <p className={`text-[12px] font-medium ${passwordLongEnough ? 'text-[#007d48]' : 'text-[#d30005]'}`}>
                {passwordLongEnough ? '✓ 8자 이상' : '8자 이상 입력해주세요'}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold text-[#111111]" htmlFor="passwordConfirm">비밀번호 확인</Label>
            <Input
              id="passwordConfirm" type="password" value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호 재입력" required
              className="rounded-none border-[#cacacb] focus-visible:ring-0 focus-visible:border-[#111111] h-11 text-[14px]"
            />
            {passwordConfirm.length > 0 && (
              <p className={`text-[12px] font-medium ${passwordsMatch ? 'text-[#007d48]' : 'text-[#d30005]'}`}>
                {passwordsMatch ? '✓ 비밀번호 일치' : '비밀번호가 일치하지 않습니다'}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !passwordLongEnough || !passwordsMatch}
            className="w-full h-12 rounded-full bg-[#111111] text-white text-[14px] font-semibold flex items-center justify-center gap-2 hover:bg-[#333] transition-colors disabled:opacity-40"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 가입 중...</>
            ) : (
              '무료로 시작하기'
            )}
          </button>
        </form>

        {/* 구분선 */}
        <div className="my-5 flex items-center gap-4">
          <div className="flex-1 h-px bg-[#e5e5e5]" />
          <span className="text-[12px] text-[#9e9ea0]">또는</span>
          <div className="flex-1 h-px bg-[#e5e5e5]" />
        </div>

        {/* Google 가입 — button-secondary */}
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full h-11 rounded-full border border-[#cacacb] text-[14px] font-medium text-[#111111] flex items-center justify-center gap-2 hover:border-[#111111] transition-colors disabled:opacity-50"
        >
          <GoogleIcon className="w-4 h-4" />
          Google로 계속하기
        </button>

        <p className="mt-4 text-center text-[12px] text-[#9e9ea0] leading-relaxed">
          가입 시{' '}
          <Link href="/terms" className="underline hover:text-[#111111]">이용약관</Link>
          {' '}및{' '}
          <Link href="/privacy" className="underline hover:text-[#111111]">개인정보처리방침</Link>
          에 동의하게 됩니다.
        </p>

        <p className="mt-5 text-center text-[14px] text-[#707072]">
          이미 계정이 있으신가요?{' '}
          <Link href="/auth/login" className="text-[#111111] font-bold hover:underline">
            로그인
          </Link>
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
