import { TossSdkLoader } from '@/components/toss-sdk-loader'

/**
 * Billing 전용 레이아웃
 *
 * TossSdkLoader를 (app)/layout.tsx 에서 분리하여 studio·history 등
 * 결제와 무관한 페이지에서 Toss SDK 스크립트 로딩을 제거.
 * billing 진입 시에만 afterInteractive로 지연 로딩.
 */
export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TossSdkLoader />
      {children}
    </>
  )
}
