'use client'

import Script from 'next/script'

/**
 * Kakao JavaScript SDK 로더
 *
 * ShareSheet의 카카오톡 공유 기능이 `window.Kakao`를 참조하기 때문에
 * 앱 레이아웃에서 한 번만 주입하고 NEXT_PUBLIC_KAKAO_JS_KEY로 초기화한다.
 *
 * - 키가 비어 있으면 스크립트를 로드하지 않고 ShareSheet는 자동으로 링크 복사 fallback으로 동작한다.
 * - `strategy="afterInteractive"` → 첫 인터랙션 이전까지는 블로킹 없이 지연 로딩.
 */
export function KakaoSdkLoader() {
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY

  if (!key) return null

  return (
    <Script
      src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
      integrity="sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4"
      crossOrigin="anonymous"
      strategy="afterInteractive"
      onLoad={() => {
        if (typeof window !== 'undefined' && window.Kakao && !window.Kakao.isInitialized()) {
          window.Kakao.init(key)
        }
      }}
    />
  )
}

// Kakao SDK 타입 확장 (share-sheet와 공유)
declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => void
      isInitialized: () => boolean
      Share: {
        sendDefault: (params: object) => void
      }
    }
  }
}
