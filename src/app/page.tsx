/**
 * 랜딩페이지 — Nike 디자인 시스템 기반 리뉴얼
 *
 * 디자인 원칙 (DESIGN-nike.md 적용):
 *  - Chrome: #111111 / #ffffff / #f5f5f5 3-tone only
 *  - Font: Pretendard Variable (KR) + Bebas Neue (EN display)
 *  - CTA: pill only (rounded-full), primary=black, secondary=outline
 *  - No drop shadows on chrome · No decorative gradients
 *  - Section rhythm: 96px vertical gap
 *  - Hairline dividers: 1px solid #e5e5e5
 *
 * 스토리텔링 파이프라인:
 *  Attention (Hero) → Problem → Solution (How) → Features → Social Proof → Pricing → CTA
 */

import Link from 'next/link'
import { ArrowRight, Check, Zap, Wand2 } from 'lucide-react'

// ─── 폰트 변수 ─────────────────────────────────────────────────────────────────
const FONT_BODY = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
const FONT_DISPLAY = "'Bebas Neue', 'Pretendard Variable', sans-serif"

// ─── 요금제 데이터 ─────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '무료',
    sub: '영원히',
    credits: 3,
    highlight: false,
    features: ['월 3회 생성', '간편 모드', '2K 해상도', '생성 내역 7일'],
    cta: '무료로 시작',
    href: '/auth/signup',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '₩19,900',
    sub: '/월',
    credits: 50,
    highlight: false,
    features: ['월 50회 생성', '간편 + 스튜디오 모드', '2K 해상도', 'SMS 공유 5건', '생성 내역 30일'],
    cta: '시작하기',
    href: '/auth/signup',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₩49,900',
    sub: '/월',
    credits: 200,
    highlight: true,
    badge: '인기',
    features: ['월 200회 생성', '4K 해상도 (Nano Banana 2)', 'SMS + 카카오 공유 무제한', '상세페이지 HTML 내보내기', '생성 내역 무제한'],
    cta: 'Pro 시작하기',
    href: '/auth/signup',
  },
  {
    id: 'business',
    name: 'Business',
    price: '₩149,000',
    sub: '/월',
    credits: 1000,
    highlight: false,
    features: ['월 1,000회 생성', '팀 계정 5명', 'API 접근 권한', '커스텀 브랜딩', '전담 지원'],
    cta: '문의하기',
    href: 'mailto:hello@productcraft.ai',
  },
]

// ─── 스텝 데이터 ───────────────────────────────────────────────────────────────
const STEPS = [
  {
    num: '01',
    title: '사진 업로드',
    body: '스마트폰으로 찍은 사진이면 충분합니다. JPG, PNG, WEBP 모두 지원. 업로드 즉시 AI 분석을 시작합니다.',
    tag: '5초',
  },
  {
    num: '02',
    title: 'AI 자동 생성',
    body: '9개의 AI 에이전트가 실시간 트렌드를 분석해 상품명 3종, 홍보문구, 상세설명을 동시에 생성합니다.',
    tag: '15~30초',
  },
  {
    num: '03',
    title: '복사 & 등록',
    body: '생성된 콘텐츠를 스마트스토어, 쿠팡, 29CM 등에 바로 붙여넣기하세요. SMS·카카오로 즉시 공유도 가능합니다.',
    tag: '즉시',
  },
]

// ─── 기능 항목 ─────────────────────────────────────────────────────────────────
const QUICK_FEATURES = [
  '트렌드 반영 상품명 3종 제안',
  '35자 이내 한줄 홍보문구',
  '400~600자 SEO 최적화 상세 설명',
  '스마트스토어 · 쿠팡 형식 자동 적용',
]

const STUDIO_FEATURES = [
  '1:1 · 4:5 · 9:16 · 16:9 다중 비율 썸네일',
  '2K ~ 4K 네이티브 고해상도',
  '원본 이미지 Subject Consistency 유지',
  '상세페이지 HTML 자동 조립',
  'SMS + 카카오톡 즉시 공유',
  'Google SynthID 워터마크 포함',
]

// ─── 페이지 ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ fontFamily: FONT_BODY, color: '#111111', backgroundColor: '#ffffff' }}>

      {/* ────────────────────────────────────────────────────────────────────────
          Utility Bar
      ──────────────────────────────────────────────────────────────────────── */}
      <div
        className="h-9 flex items-center justify-center border-b border-[#e5e5e5]"
        style={{ backgroundColor: '#f5f5f5' }}
      >
        <p className="text-xs text-[#111111]">
          🍌 &nbsp;Nano Banana 2 탑재 — AI 4K 썸네일 자동 생성&ensp;
          <Link href="/auth/signup" className="font-semibold underline hover:no-underline">
            무료 체험 시작 →
          </Link>
        </p>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          Primary Nav
      ──────────────────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 bg-white h-14 flex items-center"
        style={{ borderBottom: '1px solid #e5e5e5' }}
      >
        <div className="w-full max-w-[1440px] mx-auto px-6 md:px-12 flex items-center justify-between">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#111111' }}
            >
              <span className="text-white text-[10px] font-black tracking-tight">PC</span>
            </div>
            <span className="text-sm font-bold text-[#111111] tracking-tight hidden sm:block">
              ProductCraft AI
            </span>
          </Link>

          {/* 네비 */}
          <nav className="hidden md:flex items-center gap-7">
            {[['#how', '작동 방식'], ['#features', '기능'], ['#pricing', '요금제']].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-medium transition-colors text-[#707072] hover:text-[#111111]"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="hidden md:block text-sm font-medium px-4 py-2 transition-colors"
              style={{ color: '#707072' }}
            >
              로그인
            </Link>
            <Link
              href="/auth/signup"
              className="text-sm font-semibold text-white rounded-full px-5 py-2 transition-colors"
              style={{ backgroundColor: '#111111' }}
            >
              무료 시작
            </Link>
          </div>
        </div>
      </header>

      {/* ────────────────────────────────────────────────────────────────────────
          Hero — Campaign Tile
          Nike: 타이포그래피가 사진 위에 burn-in 되는 구조
      ──────────────────────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: '#111111' }} className="px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-[1440px] mx-auto md:px-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* 헤드라인 블록 */}
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.2em] mb-6"
                style={{ color: '#9e9ea0' }}
              >
                AI 상품 콘텐츠 자동화
              </p>

              {/* Display Headline */}
              <h1 className="mb-6" style={{ lineHeight: 1 }}>
                <span
                  className="block text-white uppercase"
                  style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(60px, 8vw, 96px)', lineHeight: 0.9 }}
                >
                  PRODUCT
                </span>
                <span
                  className="block text-white uppercase"
                  style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(60px, 8vw, 96px)', lineHeight: 0.9 }}
                >
                  CONTENT,
                </span>
                <span
                  className="block mt-3"
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 'clamp(40px, 6vw, 72px)',
                    fontWeight: 900,
                    color: '#ffffff',
                    lineHeight: 1.05,
                  }}
                >
                  30초면
                </span>
                <span
                  className="block italic"
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 'clamp(40px, 6vw, 72px)',
                    fontWeight: 900,
                    color: '#9e9ea0',
                    lineHeight: 1.05,
                  }}
                >
                  충분합니다.
                </span>
              </h1>

              <p className="text-base leading-relaxed mb-8 max-w-md" style={{ color: '#9e9ea0' }}>
                사진 한 장 올리면 AI가 트렌드 반영 상품명 3종, 홍보문구, 상세설명,
                4K 썸네일까지 한 번에 만들어드립니다.
              </p>

              {/* CTA Pills */}
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#111111] bg-white rounded-full px-7 py-3 transition-colors hover:bg-[#f5f5f5]"
                >
                  무료로 시작하기 <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="#how"
                  className="inline-flex items-center gap-2 text-sm font-medium text-white rounded-full px-7 py-3 transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  작동 방식 보기
                </Link>
              </div>
              <p className="mt-4 text-xs" style={{ color: '#707072' }}>
                카드 등록 없음 · 월 3회 무료 제공
              </p>
            </div>

            {/* Mock Output Preview — 생성 결과 미리보기 */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a' }}
            >
              {/* 상단 타이틀바 */}
              <div
                className="flex items-center gap-2 px-5 py-3"
                style={{ borderBottom: '1px solid #2a2a2a', backgroundColor: '#161616' }}
              >
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                <p className="text-xs ml-2" style={{ color: '#707072' }}>AI 생성 결과 — 러닝화 상품</p>
              </div>

              <div className="p-5 space-y-4">
                {/* 상품명 */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#707072' }}>
                    상품명 3종
                  </p>
                  {[
                    { name: '프리미엄 방수 러닝화 Pro Max', selected: true },
                    { name: '울트라라이트 트레일화 V2 Edition', selected: false },
                    { name: '올웨더 스포츠화 퍼포먼스 Pro', selected: false },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 py-2 px-3 rounded-lg mb-1"
                      style={{
                        backgroundColor: item.selected ? '#2a2a2a' : 'transparent',
                        border: item.selected ? '1px solid #3a3a3a' : '1px solid transparent',
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.selected ? '#ffffff' : '#3a3a3a' }}
                      />
                      <span className="text-sm" style={{ color: item.selected ? '#ffffff' : '#707072' }}>
                        {item.name}
                      </span>
                      {item.selected && (
                        <span
                          className="ml-auto text-[10px] font-semibold rounded-full px-2 py-0.5"
                          style={{ backgroundColor: '#ffffff', color: '#111111' }}
                        >
                          선택
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* 구분선 */}
                <div style={{ height: '1px', backgroundColor: '#2a2a2a' }} />

                {/* 홍보문구 */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#707072' }}>
                    한줄 홍보문구
                  </p>
                  <p className="text-base font-medium italic" style={{ color: '#ffffff' }}>
                    &ldquo;비 오는 날에도, 당신의 달리기를 멈추지 않는다&rdquo;
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: '#4b4b4d' }}>23자 · SEO 최적화 완료</p>
                </div>

                {/* 구분선 */}
                <div style={{ height: '1px', backgroundColor: '#2a2a2a' }} />

                {/* 태그 */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#707072' }}>
                    트렌드 키워드
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {['#러닝화', '#방수', '#트레일러닝', '#스포츠화', '#방수화'].map((tag) => (
                      <span
                        key={tag}
                        className="text-xs rounded-full px-2.5 py-1"
                        style={{ backgroundColor: '#2a2a2a', color: '#9e9ea0' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 하단 상태바 */}
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ borderTop: '1px solid #2a2a2a', backgroundColor: '#161616' }}
              >
                <p className="text-[10px]" style={{ color: '#4b4b4d' }}>생성 완료 — 23초</p>
                <p className="text-[10px] font-semibold" style={{ color: '#27c93f' }}>✓ 스마트스토어 최적화</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────────
          Trust Strip — 수치
      ──────────────────────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #e5e5e5' }} className="py-8">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-[#cacacb]">
            {[
              { val: '30초', label: '간편 모드 평균 생성 시간' },
              { val: '4K', label: 'Nano Banana 2 최대 해상도' },
              { val: '9개', label: 'AI 에이전트 동시 협업' },
              { val: '무료', label: '월 3회, 카드 등록 없이' },
            ].map((stat) => (
              <div key={stat.label} className="text-center md:px-8">
                <p
                  className="font-black tracking-tight mb-1"
                  style={{ fontFamily: FONT_DISPLAY, fontSize: '2.5rem', color: '#111111' }}
                >
                  {stat.val}
                </p>
                <p className="text-xs font-medium" style={{ color: '#707072' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────────
          Problem Section — 공감 획득
      ──────────────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-[1440px] mx-auto md:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* 좌: 문제 제기 */}
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.2em] mb-4"
                style={{ color: '#9e9ea0' }}
              >
                문제
              </p>
              <h2
                className="font-black mb-6"
                style={{ fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.1 }}
              >
                상품 하나 등록하는 데
                <br />
                <span className="italic" style={{ color: '#707072' }}>몇 시간씩 쓰고 계신가요?</span>
              </h2>
              <p className="text-base leading-relaxed mb-8" style={{ color: '#707072' }}>
                판매 채널마다 최적화된 상품명, 키워드, 상세설명을 따로 써야 하고,
                이미지는 채널 규격에 맞게 각각 편집해야 합니다.
                상품 10개만 등록해도 하루가 사라집니다.
              </p>

              {/* Before 타임라인 */}
              <div
                className="rounded-2xl p-6"
                style={{ backgroundColor: '#f5f5f5', border: '1px solid #e5e5e5' }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#9e9ea0' }}>
                  기존 방식 — 상품 1개 등록
                </p>
                <div className="space-y-3">
                  {[
                    { time: '20분', task: '상품명 · 카테고리 리서치' },
                    { time: '30분', task: '상세설명 직접 작성' },
                    { time: '15분', task: '이미지 편집 (규격 맞추기)' },
                    { time: '20분', task: '키워드 최적화 · SEO 수정' },
                    { time: '15분', task: '각 채널 형식에 맞게 재작성' },
                  ].map((item) => (
                    <div key={item.task} className="flex items-center gap-3">
                      <span
                        className="text-xs font-semibold rounded-full px-2.5 py-1 min-w-[52px] text-center"
                        style={{ backgroundColor: '#e5e5e5', color: '#707072' }}
                      >
                        {item.time}
                      </span>
                      <span className="text-sm" style={{ color: '#4b4b4d' }}>{item.task}</span>
                    </div>
                  ))}
                  <div
                    className="flex items-center gap-3 pt-2"
                    style={{ borderTop: '1px solid #cacacb' }}
                  >
                    <span
                      className="text-xs font-bold rounded-full px-2.5 py-1 min-w-[52px] text-center"
                      style={{ backgroundColor: '#111111', color: '#ffffff' }}
                    >
                      100분
                    </span>
                    <span className="text-sm font-bold text-[#111111]">총 소요 시간</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 우: 해결책 제시 */}
            <div>
              <div
                className="rounded-2xl p-6"
                style={{ backgroundColor: '#111111', color: '#ffffff' }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#9e9ea0' }}>
                  ProductCraft AI — 상품 1개 등록
                </p>
                <div className="space-y-3">
                  {[
                    { time: '5초', task: '사진 업로드', done: true },
                    { time: '25초', task: '상품명 3종 + 홍보문구 + 상세설명 생성', done: true },
                    { time: '30초', task: '4K 썸네일 4개 비율 자동 생성', done: true },
                    { time: '즉시', task: '스마트스토어 · 쿠팡 포맷 적용', done: true },
                    { time: '즉시', task: 'SMS · 카카오 공유', done: true },
                  ].map((item) => (
                    <div key={item.task} className="flex items-center gap-3">
                      <span
                        className="text-xs font-semibold rounded-full px-2.5 py-1 min-w-[52px] text-center"
                        style={{ backgroundColor: '#2a2a2a', color: '#9e9ea0' }}
                      >
                        {item.time}
                      </span>
                      <span className="text-sm" style={{ color: '#cacacb' }}>{item.task}</span>
                      <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: '#27c93f' }} strokeWidth={2.5} />
                    </div>
                  ))}
                  <div
                    className="flex items-center gap-3 pt-2"
                    style={{ borderTop: '1px solid #2a2a2a' }}
                  >
                    <span
                      className="text-xs font-bold rounded-full px-2.5 py-1 min-w-[52px] text-center"
                      style={{ backgroundColor: '#ffffff', color: '#111111' }}
                    >
                      1분
                    </span>
                    <span className="text-sm font-bold text-white">총 소요 시간</span>
                    <span
                      className="ml-auto text-xs font-semibold rounded-full px-2.5 py-1"
                      style={{ backgroundColor: '#27c93f', color: '#111111' }}
                    >
                      99% 단축
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-sm leading-relaxed" style={{ color: '#707072' }}>
                하루 10개 상품을 등록한다면? 기존에는 <strong style={{ color: '#111111' }}>16시간</strong>이 걸렸던 작업이
                이제 <strong style={{ color: '#111111' }}>10분</strong>으로 줄어듭니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────────
          How It Works — 3단계 파이프라인
      ──────────────────────────────────────────────────────────────────────── */}
      <section
        id="how"
        className="py-24 px-6"
        style={{ backgroundColor: '#f5f5f5', borderTop: '1px solid #e5e5e5', borderBottom: '1px solid #e5e5e5' }}
      >
        <div className="max-w-[1440px] mx-auto md:px-12">
          <div className="mb-14">
            <p
              className="text-xs font-semibold uppercase tracking-[0.2em] mb-4"
              style={{ color: '#9e9ea0' }}
            >
              작동 방식
            </p>
            <h2
              className="font-black"
              style={{ fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.1 }}
            >
              단 3단계로 끝납니다
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.num} className="relative">
                {/* 큰 스텝 넘버 — Nike 서명 타이포 */}
                <p
                  className="font-black mb-4 select-none"
                  style={{ fontFamily: FONT_DISPLAY, fontSize: '80px', lineHeight: 1, color: '#e5e5e5' }}
                >
                  {step.num}
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-black">{step.title}</h3>
                  <span
                    className="text-xs font-semibold rounded-full px-2.5 py-1"
                    style={{ backgroundColor: '#111111', color: '#ffffff' }}
                  >
                    {step.tag}
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#707072' }}>{step.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white rounded-full px-8 py-3.5 transition-colors"
              style={{ backgroundColor: '#111111' }}
            >
              지금 무료로 시작하기 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────────
          Features — Two Modes
      ──────────────────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-[1440px] mx-auto md:px-12">
          <div className="mb-14">
            <p
              className="text-xs font-semibold uppercase tracking-[0.2em] mb-4"
              style={{ color: '#9e9ea0' }}
            >
              두 가지 모드
            </p>
            <h2
              className="font-black"
              style={{ fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.1 }}
            >
              목적에 맞게 선택하세요
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 간편 모드 */}
            <div
              className="p-8"
              style={{ backgroundColor: '#f5f5f5', border: '1px solid #e5e5e5' }}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-5 h-5 text-[#111111]" strokeWidth={2} />
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9e9ea0' }}>
                      Quick Mode
                    </p>
                  </div>
                  <h3 className="text-2xl font-black">간편 모드</h3>
                </div>
                <span
                  className="text-xs font-semibold rounded-full px-3 py-1.5"
                  style={{ backgroundColor: '#111111', color: '#ffffff' }}
                >
                  15~30초
                </span>
              </div>
              <p className="text-sm leading-relaxed mb-6" style={{ color: '#707072' }}>
                빠른 텍스트 콘텐츠가 필요할 때. 사진 하나로 트렌드 키워드가 반영된
                상품명과 상세설명을 즉시 생성합니다.
              </p>
              <ul className="space-y-3 mb-8">
                {QUICK_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#111111]" strokeWidth={2.5} />
                    <span className="text-sm font-medium">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white rounded-full px-6 py-3 transition-colors"
                style={{ backgroundColor: '#111111' }}
              >
                간편 모드 시작
              </Link>
            </div>

            {/* 스튜디오 모드 */}
            <div
              className="p-8 relative overflow-hidden"
              style={{ backgroundColor: '#111111' }}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Wand2 className="w-5 h-5 text-white" strokeWidth={2} />
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9e9ea0' }}>
                      Studio Mode
                    </p>
                  </div>
                  <h3 className="text-2xl font-black text-white">스튜디오 모드</h3>
                </div>
                <div className="text-right">
                  <span
                    className="text-xs font-semibold rounded-full px-3 py-1.5"
                    style={{ backgroundColor: '#ffffff', color: '#111111' }}
                  >
                    Pro+
                  </span>
                </div>
              </div>
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 mb-4"
                style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
              >
                <span className="text-sm">🍌</span>
                <p className="text-xs font-semibold" style={{ color: '#9e9ea0' }}>
                  Powered by Nano Banana 2
                </p>
              </div>
              <p className="text-sm leading-relaxed mb-6" style={{ color: '#9e9ea0' }}>
                텍스트 콘텐츠에 4K 썸네일과 HTML 상세페이지까지. 브랜드 완성도를
                높이는 모든 것을 한 번에 생성합니다.
              </p>
              <ul className="space-y-3 mb-8">
                {STUDIO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-white" strokeWidth={2.5} />
                    <span className="text-sm font-medium text-white">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#111111] bg-white rounded-full px-6 py-3 transition-colors hover:bg-[#f5f5f5]"
              >
                스튜디오 시작 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────────
          Nano Banana 2 — Editorial Campaign Section
          Nike: campaign tile with display type burned in
      ──────────────────────────────────────────────────────────────────────── */}
      <section
        className="py-24 px-6"
        style={{ backgroundColor: '#111111', borderTop: '1px solid #1c1c1c' }}
      >
        <div className="max-w-[1440px] mx-auto md:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.2em] mb-4"
                style={{ color: '#9e9ea0' }}
              >
                썸네일 생성
              </p>
              <h2
                className="font-black text-white mb-2"
                style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(48px, 6vw, 80px)', lineHeight: 0.95, letterSpacing: 0 }}
              >
                NANO BANANA 2.
              </h2>
              <p
                className="font-black text-white mb-6"
                style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', lineHeight: 1.1 }}
              >
                단순한 이미지가 아닙니다.
                <span className="italic" style={{ color: '#9e9ea0' }}> 브랜드입니다.</span>
              </p>
              <p className="text-base leading-relaxed mb-8" style={{ color: '#9e9ea0' }}>
                Google Gemini 기반의 Nano Banana 2가 상품 사진의 피사체 일관성을 유지하면서
                인스타그램 피드, 스토리, 유튜브 배너, 모바일 쇼핑몰에 최적화된
                4가지 비율의 4K 썸네일을 동시에 생성합니다.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { ratio: '1:1', use: '인스타그램 피드', size: '2K–4K' },
                  { ratio: '4:5', use: '인스타 세로형', size: '2K–4K' },
                  { ratio: '9:16', use: '스토리 · 릴스', size: '2K–4K' },
                  { ratio: '16:9', use: '유튜브 · 배너', size: '2K–4K' },
                ].map((item) => (
                  <div
                    key={item.ratio}
                    className="rounded-xl p-4"
                    style={{ backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a' }}
                  >
                    <p
                      className="font-black mb-1"
                      style={{ fontFamily: FONT_DISPLAY, fontSize: '28px', color: '#ffffff' }}
                    >
                      {item.ratio}
                    </p>
                    <p className="text-xs" style={{ color: '#707072' }}>{item.use}</p>
                    <p className="text-[10px] font-semibold mt-1" style={{ color: '#4b4b4d' }}>{item.size}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs" style={{ color: '#4b4b4d' }}>
                * 생성된 이미지에는 Google SynthID 워터마크가 포함됩니다.
                AI 생성 콘텐츠임을 명시해야 합니다.
              </p>
            </div>

            {/* 썸네일 그리드 프리뷰 */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { ratio: '1/1', label: '1:1', use: '인스타그램 피드', bg: '#1c1c1c' },
                { ratio: '4/5', label: '4:5', use: '인스타 세로형', bg: '#1a1a1a' },
                { ratio: '9/16', label: '9:16', use: '스토리', bg: '#181818' },
                { ratio: '16/9', label: '16:9', use: '배너', bg: '#1c1c1c' },
              ].map((item) => (
                <div key={item.label}>
                  <div
                    className="w-full rounded-xl overflow-hidden flex items-center justify-center"
                    style={{
                      aspectRatio: item.ratio,
                      backgroundColor: item.bg,
                      border: '1px solid #2a2a2a',
                    }}
                  >
                    <div className="text-center">
                      <p
                        className="font-black"
                        style={{ fontFamily: FONT_DISPLAY, fontSize: '24px', color: '#3a3a3a' }}
                      >
                        {item.label}
                      </p>
                      <p className="text-[9px] mt-0.5" style={{ color: '#2a2a2a' }}>AI 생성</p>
                    </div>
                  </div>
                  <p className="text-[10px] font-semibold mt-1.5" style={{ color: '#707072' }}>{item.use}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────────
          Pricing
      ──────────────────────────────────────────────────────────────────────── */}
      <section
        id="pricing"
        className="py-24 px-6"
        style={{ backgroundColor: '#f5f5f5', borderTop: '1px solid #e5e5e5', borderBottom: '1px solid #e5e5e5' }}
      >
        <div className="max-w-[1440px] mx-auto md:px-12">
          <div className="mb-14">
            <p
              className="text-xs font-semibold uppercase tracking-[0.2em] mb-4"
              style={{ color: '#9e9ea0' }}
            >
              요금제
            </p>
            <h2
              className="font-black"
              style={{ fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.1 }}
            >
              투명한 가격 정책
            </h2>
            <p className="mt-3 text-base" style={{ color: '#707072' }}>
              숨겨진 비용 없음 · 월간 구독 · 언제든 해지 가능
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className="relative flex flex-col bg-white p-6"
                style={{
                  border: plan.highlight ? '2px solid #111111' : '1px solid #e5e5e5',
                }}
              >
                {'badge' in plan && plan.badge && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[11px] font-bold rounded-full px-3 py-1 whitespace-nowrap"
                    style={{ backgroundColor: '#111111', color: '#ffffff' }}
                  >
                    {plan.badge}
                  </div>
                )}

                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9e9ea0' }}>
                  {plan.name}
                </p>
                <div className="flex items-end gap-1 mb-1">
                  <span
                    className="font-black tracking-tight"
                    style={{ fontSize: 'clamp(24px, 3vw, 32px)' }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-xs pb-1" style={{ color: '#9e9ea0' }}>{plan.sub}</span>
                </div>
                <p className="text-xs mb-5" style={{ color: '#9e9ea0' }}>
                  월 {plan.credits.toLocaleString()}크레딧
                </p>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#9e9ea0' }} strokeWidth={2.5} />
                      <span className="text-xs font-medium" style={{ color: '#4b4b4d' }}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className="block text-center text-sm font-semibold rounded-full py-2.5 transition-colors"
                  style={
                    plan.highlight
                      ? { backgroundColor: '#111111', color: '#ffffff' }
                      : { border: '1px solid #cacacb', color: '#111111', backgroundColor: '#ffffff' }
                  }
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs" style={{ color: '#9e9ea0' }}>
            플랜 없이 크레딧만 충전도 가능합니다 —{' '}
            <Link href="/billing#topup" className="underline" style={{ color: '#707072' }}>
              소액 크레딧 구매 →
            </Link>
          </p>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────────
          Final CTA — Dark Editorial Block
      ──────────────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ backgroundColor: '#111111' }}>
        <div className="max-w-[1440px] mx-auto md:px-12 text-center">
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em] mb-6"
            style={{ color: '#9e9ea0' }}
          >
            지금 시작하세요
          </p>
          <h2
            className="font-black text-white mb-4"
            style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(48px, 7vw, 96px)', lineHeight: 0.95 }}
          >
            상품 등록의 새 기준.
          </h2>
          <p
            className="text-base font-medium mb-10 max-w-lg mx-auto leading-relaxed"
            style={{ color: '#9e9ea0' }}
          >
            카드 등록 없이 월 3회 무료. 지금 바로 사진 한 장으로 시작해보세요.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#111111] bg-white rounded-full px-8 py-3.5 transition-colors hover:bg-[#f5f5f5]"
            >
              무료로 시작하기 <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-white rounded-full px-8 py-3.5"
              style={{ border: '1px solid rgba(255,255,255,0.2)' }}
            >
              로그인
            </Link>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────────
          Footer — 4-Column
      ──────────────────────────────────────────────────────────────────────── */}
      <footer
        className="px-6 pt-16 pb-8"
        style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e5e5e5' }}
      >
        <div className="max-w-[1440px] mx-auto md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-12" style={{ borderBottom: '1px solid #e5e5e5' }}>
            {/* 브랜드 */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#111111' }}
                >
                  <span className="text-white text-[10px] font-black">PC</span>
                </div>
                <span className="text-sm font-bold text-[#111111]">ProductCraft AI</span>
              </div>
              <p className="text-xs leading-relaxed max-w-xs" style={{ color: '#9e9ea0' }}>
                사진 한 장으로 팔리는 상품 콘텐츠를.
                AI가 트렌드를 분석해 상품명·홍보문구·썸네일을 자동 생성합니다.
              </p>
            </div>

            {/* 서비스 */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#111111' }}>
                서비스
              </p>
              <div className="space-y-3">
                {[
                  ['/studio', '스튜디오'],
                  ['/#features', '기능 소개'],
                  ['/#pricing', '요금제'],
                  ['/billing#topup', '크레딧 충전'],
                ].map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    className="block text-xs transition-colors"
                    style={{ color: '#9e9ea0' }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* 계정 */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#111111' }}>
                계정
              </p>
              <div className="space-y-3">
                {[
                  ['/auth/signup', '무료 회원가입'],
                  ['/auth/login', '로그인'],
                  ['/history', '생성 내역'],
                  ['/billing', '플랜 관리'],
                ].map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    className="block text-xs transition-colors"
                    style={{ color: '#9e9ea0' }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* 법적 고지 */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#111111' }}>
                법적 고지
              </p>
              <div className="space-y-3">
                {[
                  ['/terms', '이용약관'],
                  ['/privacy', '개인정보처리방침'],
                ].map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    className="block text-xs transition-colors"
                    style={{ color: '#9e9ea0' }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* 하단 법적 고지 */}
          <div className="pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <p className="text-[11px]" style={{ color: '#9e9ea0' }}>
              © 2026 ProductCraft AI. All rights reserved.
            </p>
            <p className="text-[11px] text-center" style={{ color: '#9e9ea0' }}>
              AI 생성 이미지에는 Google SynthID 워터마크가 포함됩니다.
              본 서비스의 일부 콘텐츠는 AI가 자동 생성합니다.
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}
