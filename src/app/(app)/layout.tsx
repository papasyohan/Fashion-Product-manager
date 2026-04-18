import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ProductCraft AI — Studio',
  description: '제품 사진으로 팔리는 상품 콘텐츠를 자동 생성',
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
