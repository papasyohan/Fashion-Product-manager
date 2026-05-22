'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, ChevronDown, Zap, History, CreditCard, Shield } from 'lucide-react'
import { useStudioStore } from '@/store/studio'

export function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const resetStudio = useStudioStore((s) => s.reset)
  const [credits, setCredits] = useState<number | null>(null)
  const [plan, setPlan] = useState<string>('free')
  const [isAdmin, setIsAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserEmail(user.email ?? null)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('credits_left, plan, role')
        .eq('id', user.id)
        .single()
      if (profile) {
        setCredits(profile.credits_left)
        setPlan(profile.plan)
        setIsAdmin(profile.role === 'admin')
      }
    }
    fetchProfile()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const navLinks = [
    { href: '/studio', label: '스튜디오', icon: Zap },
    { href: '/history', label: '히스토리', icon: History },
    { href: '/billing', label: '플랜·결제', icon: CreditCard },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: Shield }] : []),
  ]

  const planLabel: Record<string, string> = {
    free: 'FREE',
    starter: 'STARTER',
    pro: 'PRO',
    business: 'BUSINESS',
  }

  return (
    <header
      className="sticky top-0 z-50 bg-white h-14 flex items-center"
      style={{ borderBottom: '1px solid #e5e5e5' }}
    >
      <div className="w-full max-w-[1440px] mx-auto px-6 md:px-12 flex items-center justify-between">

        {/* 로고 — 클릭 시 스튜디오 상태 초기화 후 메인으로 */}
        <Link href="/studio" onClick={resetStudio} className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-7 h-7 rounded-full bg-[#111111] flex items-center justify-center">
            <span className="text-white text-[10px] font-black tracking-tight">PC</span>
          </div>
          <span className="text-[14px] font-bold text-[#111111] tracking-tight hidden sm:block">
            ProductCraft AI
          </span>
        </Link>

        {/* 네비 — Nike: 활성 탭은 2px bottom underline */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={href === '/studio' ? resetStudio : undefined}
                className="relative text-[14px] font-medium pb-1 transition-colors"
                style={{ color: isActive ? '#111111' : '#707072' }}
              >
                {label}
                {/* 2px 하단 인디케이터 */}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#111111]"
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* 오른쪽: Nano Banana · 플랜 · 크레딧 · 유저 */}
        <div className="flex items-center gap-3">

          {/* Nano Banana 2 */}
          <div
            className="hidden md:flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#111111]"
            style={{ backgroundColor: '#f5f5f5', border: '1px solid #e5e5e5' }}
          >
            🍌 Nano Banana 2
          </div>

          {/* 플랜 + 크레딧 */}
          {credits !== null && (
            <div className="hidden md:flex items-center gap-2 text-[12px]">
              <span
                className="px-2 py-0.5 text-[10px] font-black tracking-widest text-white bg-[#111111]"
              >
                {planLabel[plan] ?? 'FREE'}
              </span>
              <span className="text-[#707072]">
                크레딧 <span className="font-bold text-[#111111]">{credits}</span>
              </span>
            </div>
          )}

          {/* 유저 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#111111] border border-[#cacacb] hover:border-[#111111] transition-colors"
            >
              {userEmail ? userEmail.split('@')[0] : '계정'}
              <ChevronDown className="w-3.5 h-3.5 text-[#707072]" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div
                  className="absolute right-0 top-10 z-50 w-48 bg-white overflow-hidden"
                  style={{ border: '1px solid #e5e5e5' }}
                >
                  {navLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => {
                        setMenuOpen(false)
                        if (href === '/studio') resetStudio()
                      }}
                      className="flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium text-[#111111] hover:bg-[#f5f5f5] transition-colors"
                    >
                      <Icon className="w-4 h-4 text-[#9e9ea0]" />
                      {label}
                    </Link>
                  ))}

                  {/* 모바일: 크레딧 표시 */}
                  {credits !== null && (
                    <div
                      className="flex items-center justify-between px-4 py-2.5 md:hidden"
                      style={{ borderTop: '1px solid #e5e5e5' }}
                    >
                      <span className="text-[11px] font-black tracking-widest text-white bg-[#111111] px-2 py-0.5">
                        {planLabel[plan] ?? 'FREE'}
                      </span>
                      <span className="text-[12px] text-[#707072]">
                        크레딧 <span className="font-bold text-[#111111]">{credits}</span>
                      </span>
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid #e5e5e5' }} />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium text-[#d30005] hover:bg-[#fff5f5] transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
