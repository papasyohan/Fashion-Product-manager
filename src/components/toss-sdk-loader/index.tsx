'use client'

import Script from 'next/script'

/**
 * Toss Payments SDK 로더
 *
 * billing 페이지에서 결제창을 열 때 `window.TossPayments`가 필요하므로
 * 앱 레이아웃에서 한 번만 주입한다.
 *
 * - 공식 CDN: https://js.tosspayments.com/v1/payment
 * - `strategy="afterInteractive"` — 첫 상호작용 전까지는 블로킹 없이 지연 로딩
 *
 * 클라이언트 키가 없어도 스크립트는 로드되며, 실제 결제 호출 시점에
 * `NEXT_PUBLIC_TOSS_CLIENT_KEY`를 사용한다.
 */
export function TossSdkLoader() {
  return (
    <Script
      src="https://js.tosspayments.com/v1/payment"
      strategy="afterInteractive"
    />
  )
}

// ─── 타입 선언 ───────────────────────────────────────────────────────────

type TossPaymentMethod = '카드' | '계좌이체' | '가상계좌' | '휴대폰' | '토스페이'

interface TossPaymentRequestOptions {
  amount: number
  orderId: string
  orderName: string
  customerName?: string
  customerEmail?: string
  successUrl: string
  failUrl: string
}

interface TossPaymentsInstance {
  requestPayment: (method: TossPaymentMethod, options: TossPaymentRequestOptions) => Promise<void>
}

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsInstance
  }
}
