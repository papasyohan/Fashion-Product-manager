import type { Metadata } from 'next'
import { AppNav } from '@/components/app-nav'
import { KakaoSdkLoader } from '@/components/kakao-sdk-loader'
// TossSdkLoader는 billing 페이지에서만 필요 → billing/layout.tsx 로 이동
// studio·history 페이지에서 불필요한 외부 스크립트 로딩 방지

export const metadata: Metadata = {
  title: 'ProductCraft AI — Studio',
  description: '제품 사진으로 팔리는 상품 콘텐츠를 자동 생성',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <KakaoSdkLoader />
      <AppNav />
      <main>{children}</main>
    </div>
  )
}
