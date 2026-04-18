import type { Metadata } from 'next'
import { AppNav } from '@/components/app-nav'

export const metadata: Metadata = {
  title: 'ProductCraft AI — Studio',
  description: '제품 사진으로 팔리는 상품 콘텐츠를 자동 생성',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <AppNav />
      <main>{children}</main>
    </div>
  )
}
