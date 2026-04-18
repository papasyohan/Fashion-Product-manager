import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Noto+Serif+KR:wght@400;600&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
