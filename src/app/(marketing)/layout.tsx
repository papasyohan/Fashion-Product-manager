import type { Metadata } from 'next'
import Link from 'next/link'
import { Package } from 'lucide-react'

export const metadata: Metadata = {
  title: 'ProductCraft AI — 사진 한 장으로 팔리는 상품 콘텐츠',
  description: 'AI가 30초 만에 상품명·홍보문구·상세설명·썸네일까지 자동 생성. 스마트스토어·쿠팡 최적화.',
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {/* 마케팅 헤더 */}
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b border-stone-200 bg-white/80 backdrop-blur-sm"
        style={{ fontFamily: "'Instrument Serif', 'Noto Serif KR', Georgia, serif" }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-pink-500 flex items-center justify-center">
              <Package className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg tracking-tight">
              ProductCraft <span className="italic text-stone-500">AI</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/#pricing" className="text-sm font-sans text-stone-600 hover:text-stone-900 transition-colors">
              요금제
            </Link>
            <Link
              href="/auth/login"
              className="px-4 py-1.5 rounded-full border border-stone-300 text-sm font-sans text-stone-700 hover:border-stone-900 transition-colors"
            >
              로그인
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-1.5 rounded-full bg-stone-900 text-white text-sm font-sans font-semibold hover:bg-stone-700 transition-colors"
            >
              무료 시작
            </Link>
          </nav>
        </div>
      </header>

      <main className="pt-14">{children}</main>

      {/* 마케팅 푸터 */}
      <footer
        className="border-t border-stone-200 bg-stone-50 py-12"
        style={{ fontFamily: "'Instrument Serif', 'Noto Serif KR', Georgia, serif" }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-400 to-pink-500 flex items-center justify-center">
                  <Package className="w-3 h-3 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-base tracking-tight">ProductCraft AI</span>
              </div>
              <p className="text-xs font-sans text-stone-500 max-w-xs leading-relaxed">
                AI가 상품명·홍보문구·상세설명·썸네일을 자동 생성합니다.
              </p>
            </div>
            <div className="flex gap-12">
              <div>
                <p className="text-xs font-sans font-semibold text-stone-700 uppercase tracking-wider mb-3">
                  서비스
                </p>
                <div className="space-y-2">
                  <Link href="/studio" className="block text-xs font-sans text-stone-500 hover:text-stone-900">스튜디오</Link>
                  <Link href="/auth/signup" className="block text-xs font-sans text-stone-500 hover:text-stone-900">회원가입</Link>
                  <Link href="/#pricing" className="block text-xs font-sans text-stone-500 hover:text-stone-900">요금제</Link>
                </div>
              </div>
              <div>
                <p className="text-xs font-sans font-semibold text-stone-700 uppercase tracking-wider mb-3">
                  법적 고지
                </p>
                <div className="space-y-2">
                  <Link href="/terms" className="block text-xs font-sans text-stone-500 hover:text-stone-900">이용약관</Link>
                  <Link href="/privacy" className="block text-xs font-sans text-stone-500 hover:text-stone-900">개인정보처리방침</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-stone-200 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-[11px] font-sans text-stone-400">
              © 2026 ProductCraft AI. All rights reserved.
            </p>
            <p className="text-[11px] font-sans text-stone-400 text-center">
              AI 생성 이미지에는 Google SynthID 워터마크가 포함됩니다. 본 서비스의 일부 콘텐츠는 AI가 자동 생성합니다.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
