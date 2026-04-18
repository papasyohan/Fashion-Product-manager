/**
 * 랜딩 페이지 (marketing)
 * 인증된 사용자 → proxy.ts 미들웨어가 /studio로 리다이렉트
 */
import Link from 'next/link'
import { Zap, Wand2, Check, ArrowRight, Sparkles, Package } from 'lucide-react'

const PLANS = [
  {
    name: 'Free',    price: '무료',     sub: '체험용', credits: 3,    highlight: false,
    features: ['월 3회 생성', '간편 모드', '2K 해상도'],
    cta: '무료로 시작',
  },
  {
    name: 'Starter', price: '₩19,900', sub: '/월',   credits: 50,   highlight: false,
    features: ['월 50회 생성', '간편 + 스튜디오 모드', '2K 해상도', 'SMS 공유 5건'],
    cta: '시작하기',
  },
  {
    name: 'Pro',     price: '₩49,900', sub: '/월',   credits: 200,  highlight: true,  badge: '인기',
    features: ['월 200회 생성', '4K 해상도', 'SMS + 카카오 공유', '상세페이지 내보내기', '내역 무제한'],
    cta: 'Pro 시작하기',
  },
  {
    name: 'Business', price: '₩149,000', sub: '/월', credits: 1000, highlight: false,
    features: ['월 1,000회 생성', '팀 5명', 'API 접근', '커스텀 브랜딩', '전담 지원'],
    cta: '문의하기',
  },
]

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'Instrument Serif', 'Noto Serif KR', Georgia, serif" }}>

      {/* 헤더 */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-stone-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-pink-500 flex items-center justify-center">
              <Package className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg tracking-tight">ProductCraft <span className="italic text-stone-500">AI</span></span>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/#pricing" className="text-sm font-sans text-stone-600 hover:text-stone-900 hidden md:block">요금제</Link>
            <Link href="/auth/login" className="px-4 py-1.5 rounded-full border border-stone-300 text-sm font-sans text-stone-700 hover:border-stone-900 transition-colors">로그인</Link>
            <Link href="/auth/signup" className="px-4 py-1.5 rounded-full bg-stone-900 text-white text-sm font-sans font-semibold hover:bg-stone-700 transition-colors">무료 시작</Link>
          </nav>
        </div>
      </header>

      {/* 히어로 */}
      <section className="max-w-6xl mx-auto px-6 pt-32 pb-16 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900 text-stone-50 text-xs font-sans mb-6">
          <Sparkles className="w-3 h-3" /> 사진 한 장으로 시작하는 AI 상품 마케팅
        </div>
        <h1 className="text-5xl md:text-7xl leading-[1.1] tracking-tight text-stone-900 mb-6">
          상품 등록,<br /><span className="italic text-stone-500">30초면 충분합니다</span>
        </h1>
        <p className="text-lg text-stone-500 font-sans max-w-xl mx-auto mb-10 leading-relaxed">
          제품 사진 하나로 AI가 트렌드 반영 상품명·홍보문구·상세설명·4K 썸네일까지 한 번에 만들어드립니다.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/auth/signup" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-stone-900 text-white font-sans font-semibold text-base hover:bg-stone-700 transition-colors">
            무료로 시작하기 <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/auth/login" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-stone-300 text-stone-700 font-sans text-base hover:border-stone-900 transition-colors">
            로그인
          </Link>
        </div>
        <p className="mt-4 text-xs font-sans text-stone-400">카드 등록 없음 · 월 3회 무료 제공</p>
      </section>

      {/* 모드 소개 */}
      <section className="bg-stone-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-sans uppercase tracking-widest text-stone-400 mb-3">두 가지 모드</p>
            <h2 className="text-4xl tracking-tight">목적에 맞게 선택하세요</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-3xl border-2 border-stone-200 bg-white p-8 hover:border-stone-400 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center mb-5">
                <Zap className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div className="mb-1 flex items-baseline gap-2">
                <h3 className="text-2xl tracking-tight">간편 모드</h3>
                <span className="text-xs font-sans text-stone-400 uppercase tracking-widest">Quick Mode</span>
              </div>
              <p className="text-sm font-sans text-stone-500 mb-4">15~30초</p>
              <ul className="space-y-2">
                {['트렌드 반영 상품명 3종', '35자 이내 홍보문구', '400~600자 상세 설명', 'SEO 키워드 자동 삽입'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm font-sans text-stone-700">
                    <Check className="w-4 h-4 text-amber-500" strokeWidth={2.5} /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border-2 border-stone-200 bg-white p-8 hover:border-stone-400 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center mb-5">
                <Wand2 className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div className="mb-1 flex items-baseline gap-2">
                <h3 className="text-2xl tracking-tight">스튜디오 모드</h3>
                <span className="text-xs font-sans text-stone-400 uppercase tracking-widest">Studio Mode</span>
              </div>
              <p className="text-sm font-sans text-stone-500 mb-2">1~3분 · Pro 플랜</p>
              <div className="mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-[11px] font-sans font-semibold text-yellow-900">
                🍌 Powered by Nano Banana 2
              </div>
              <ul className="space-y-2">
                {['1:1·4:5·9:16·16:9 다중 비율', '2K~4K 네이티브 해상도', 'Subject Consistency 유지', '상세페이지 HTML 자동 조립', 'SMS + 카카오톡 즉시 공유'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm font-sans text-stone-700">
                    <Check className="w-4 h-4 text-violet-500" strokeWidth={2.5} /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 수치 */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="rounded-3xl bg-stone-900 text-stone-50 p-10 md:p-14">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { val: '30초', lbl: '간편 모드 생성' },
                { val: '3분', lbl: '스튜디오 모드 생성' },
                { val: '4K', lbl: '최대 해상도 (Pro)' },
                { val: '9개', lbl: 'AI 에이전트 협업' },
              ].map((m) => (
                <div key={m.lbl}>
                  <div className="text-4xl md:text-5xl font-bold tracking-tight text-amber-400 mb-2">{m.val}</div>
                  <div className="text-xs font-sans text-stone-400 uppercase tracking-wider">{m.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 요금제 */}
      <section id="pricing" className="bg-stone-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-sans uppercase tracking-widest text-stone-400 mb-3">요금제</p>
            <h2 className="text-4xl tracking-tight">투명한 가격 정책</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-3xl border-2 p-6 bg-white flex flex-col
                  ${'highlight' in plan && plan.highlight ? 'border-stone-900 shadow-2xl scale-[1.02]' : 'border-stone-200'}`}
              >
                {'badge' in plan && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-stone-900 text-white text-[11px] font-sans font-bold whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}
                <div className="mb-4">
                  <p className="text-sm font-sans font-semibold text-stone-500 uppercase tracking-wider mb-2">{plan.name}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl tracking-tight font-semibold">{plan.price}</span>
                    <span className="text-xs font-sans text-stone-400 mb-1">{plan.sub}</span>
                  </div>
                  <p className="text-xs font-sans text-stone-400 mt-1">월 {plan.credits}크레딧</p>
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs font-sans text-stone-600">
                      <Check className="w-3.5 h-3.5 mt-0.5 text-stone-400 flex-shrink-0" strokeWidth={2.5} /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup"
                  className={`w-full text-center py-2.5 rounded-full text-sm font-sans font-semibold transition-colors
                    ${'highlight' in plan && plan.highlight ? 'bg-stone-900 text-white hover:bg-stone-700' : 'border border-stone-300 text-stone-700 hover:border-stone-900'}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-pink-500 flex items-center justify-center mb-6">
            <Package className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
          <h2 className="text-4xl md:text-5xl tracking-tight mb-4">지금 바로 시작하세요</h2>
          <p className="text-stone-500 font-sans mb-8">카드 등록 없이 무료로 3번 사용해보세요.</p>
          <Link href="/auth/signup" className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-stone-900 text-white font-sans font-semibold text-lg hover:bg-stone-700 transition-colors">
            무료로 시작하기 <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-stone-200 bg-stone-50 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs font-sans text-stone-400">© 2026 ProductCraft AI. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms"   className="text-xs font-sans text-stone-400 hover:text-stone-700">이용약관</Link>
            <Link href="/privacy" className="text-xs font-sans text-stone-400 hover:text-stone-700">개인정보처리방침</Link>
          </div>
          <p className="text-[11px] font-sans text-stone-400 text-center">
            AI 생성 이미지에는 Google SynthID 워터마크가 포함됩니다.
          </p>
        </div>
      </footer>

    </div>
  )
}
