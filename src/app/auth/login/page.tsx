'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Package, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
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

  const handleGoogleLogin = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
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

        <h1 className="text-3xl tracking-tight mb-1">로그인</h1>
        <p className="text-sm text-stone-500 font-sans mb-6">
          계속하려면 로그인하세요
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm font-sans text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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
              '로그인'
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
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full mt-4 rounded-full font-sans border-stone-300"
        >
          Google로 계속하기
        </Button>

        <p className="mt-6 text-center text-sm font-sans text-stone-500">
          계정이 없으신가요?{' '}
          <Link href="/auth/signup" className="text-stone-900 font-semibold hover:underline">
            회원가입
          </Link>
        </p>
      </Card>
    </div>
  )
}
