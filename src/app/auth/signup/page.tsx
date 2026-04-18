'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Package, Loader2, Check } from 'lucide-react'
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

    if (!passwordLongEnough) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (!passwordsMatch) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signupError) {
      if (signupError.message.includes('already registered')) {
        setError('이미 가입된 이메일입니다. 로그인 페이지를 이용해주세요.')
      } else {
        setError('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.')
      }
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  if (success) {
    return (
      <div
        className="min-h-screen bg-stone-50 flex items-center justify-center px-4"
        style={{ fontFamily: "'Instrument Serif', 'Noto Serif KR', Georgia, serif" }}
      >
        <Card className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 shadow-sm text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-pink-500 flex items-center justify-center mb-6">
            <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl tracking-tight mb-2">이메일을 확인해주세요</h1>
          <p className="text-sm text-stone-500 font-sans mb-6 leading-relaxed">
            <strong className="text-stone-900">{email}</strong>로 인증 메일을 발송했습니다.
            <br />
            메일함을 확인하고 링크를 클릭하면 가입이 완료됩니다.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push('/auth/login')}
            className="w-full rounded-full font-sans border-stone-300"
          >
            로그인 페이지로
          </Button>
        </Card>
      </div>
    )
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

        <h1 className="text-3xl tracking-tight mb-1">회원가입</h1>
        <p className="text-sm text-stone-500 font-sans mb-6">
          30초 만에 시작하는 AI 상품 콘텐츠
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm font-sans text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="font-sans text-sm text-stone-700" htmlFor="name">
              이름
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              required
              className="rounded-xl font-sans"
            />
          </div>

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
              placeholder="8자 이상"
              required
              minLength={8}
              className="rounded-xl font-sans"
            />
            {password.length > 0 && (
              <p className={`text-xs font-sans ${passwordLongEnough ? 'text-green-600' : 'text-red-500'}`}>
                {passwordLongEnough ? '✓ 8자 이상' : '8자 이상 입력해주세요'}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="font-sans text-sm text-stone-700" htmlFor="passwordConfirm">
              비밀번호 확인
            </Label>
            <Input
              id="passwordConfirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호 재입력"
              required
              className="rounded-xl font-sans"
            />
            {passwordConfirm.length > 0 && (
              <p className={`text-xs font-sans ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                {passwordsMatch ? '✓ 비밀번호 일치' : '비밀번호가 일치하지 않습니다'}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !passwordLongEnough || !passwordsMatch}
            className="w-full rounded-full bg-stone-900 text-white font-sans font-semibold hover:bg-stone-700 disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 가입 중...</>
            ) : (
              '무료로 시작하기'
            )}
          </Button>
        </form>

        <div className="mt-4 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs font-sans text-stone-400">또는</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full mt-4 rounded-full font-sans border-stone-300"
        >
          Google로 계속하기
        </Button>

        <p className="mt-4 text-xs text-center font-sans text-stone-400 leading-relaxed">
          가입 시{' '}
          <Link href="/terms" className="underline hover:text-stone-700">이용약관</Link>
          {' '}및{' '}
          <Link href="/privacy" className="underline hover:text-stone-700">개인정보처리방침</Link>
          에 동의하게 됩니다.
        </p>

        <p className="mt-4 text-center text-sm font-sans text-stone-500">
          이미 계정이 있으신가요?{' '}
          <Link href="/auth/login" className="text-stone-900 font-semibold hover:underline">
            로그인
          </Link>
        </p>
      </Card>
    </div>
  )
}
