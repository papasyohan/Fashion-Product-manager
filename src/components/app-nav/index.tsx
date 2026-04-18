'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Package, History, CreditCard, LogOut, ChevronDown } from 'lucide-react'

export function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [credits, setCredits] = useState<number | null>(null)
  const [plan, setPlan] = useState<string>('free')
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
        .select('credits_left, plan')
        .eq('id', user.id)
        .single()

      if (profile) {
        setCredits(profile.credits_left)
        setPlan(profile.plan)
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
    { href: '/studio', label: '스튜디오', icon: Package },
    { href: '/history', label: '히스토리', icon: History },
    { href: '/billing', label: '플랜·결제', icon: CreditCard },
  ]

  const planColors: Record<string, string> = {
    free: 'text-stone-500 bg-stone-100',
    starter: 'text-blue-700 bg-blue-50',
    pro: 'text-violet-700 bg-violet-50',
    business: 'text-amber-700 bg-amber-50',
  }

  return (
    <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50"
      style={{ fontFamily: "'Instrument Serif', 'Noto Serif KR', Georgia, serif" }}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* 로고 */}
        <Link href="/studio" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-pink-500 flex items-center justify-center">
            <Package className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg tracking-tight">
            ProductCraft <span className="italic text-stone-500">AI</span>
          </span>
        </Link>

        {/* 네비게이션 링크 */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-full text-sm font-sans transition-colors ${
                pathname.startsWith(href)
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* 오른쪽: 크레딧 + 유저 메뉴 */}
        <div className="flex items-center gap-3">
          {/* Nano Banana 배지 */}
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-[11px] font-sans text-yellow-800 font-medium">
            🍌 Nano Banana 2
          </div>

          {/* 크레딧 */}
          {credits !== null && (
            <div className="flex items-center gap-1.5 text-xs font-sans">
              <span
                className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${planColors[plan] ?? planColors.free}`}
              >
                {plan}
              </span>
              <span className="text-stone-500">
                크레딧 <span className="font-semibold text-stone-900">{credits}</span>
              </span>
            </div>
          )}

          {/* 유저 메뉴 */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-stone-200 text-xs font-sans text-stone-700 hover:border-stone-400 transition-colors"
            >
              {userEmail ? userEmail.split('@')[0] : '계정'}
              <ChevronDown className="w-3 h-3" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-9 z-50 w-48 rounded-2xl border border-stone-200 bg-white shadow-lg overflow-hidden">
                  {navLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-sm font-sans text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-stone-400" />
                      {label}
                    </Link>
                  ))}
                  <div className="border-t border-stone-100" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-sans text-red-600 hover:bg-red-50 transition-colors"
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
