import type { Metadata } from 'next'
import { Bebas_Neue, Instrument_Serif } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'

// ─── 폰트 정의 (next/font — self-hosted, zero-CLS) ───────────────────────────
// CDN <link> 태그 대비: 외부 커넥션 제거 + font-display:swap 자동 적용 + 캐시 최적화

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display-latin',
  display: 'swap',
  preload: true,
})

const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
  preload: false, // 랜딩 히어로에서만 사용 — 크리티컬 경로 제외
})

// Pretendard Variable — 한글 본문 폰트 (Google Fonts 미등록 → local self-host)
const pretendard = localFont({
  src: '../../public/fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  weight: '100 900',
  display: 'swap',
  preload: true,
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
})

export const metadata: Metadata = {
  title: 'ProductCraft AI — 팔리는 상품 콘텐츠 자동 생성',
  description:
    '제품 사진 업로드 → AI가 상품명 3종 + 한줄 홍보문구 + 상세설명 + 고화질 썸네일 자동 생성',
  openGraph: {
    title: 'ProductCraft AI',
    description: '제품 사진 한 장으로 팔리는 상품 콘텐츠를 30초 안에',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      className={`h-full antialiased ${pretendard.variable} ${bebasNeue.variable} ${instrumentSerif.variable}`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
