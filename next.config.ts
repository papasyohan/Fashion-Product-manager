import type { NextConfig } from "next";

// SEC-13: 보안 헤더 — 모든 응답에 적용
const SECURITY_HEADERS = [
  // 클릭재킹 방어: 동일 출처 iframe만 허용
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // MIME 스니핑 방어: Content-Type을 반드시 따르도록 강제
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Referrer 정보 최소화 (외부 사이트로 경로 정보 미전송)
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // XSS 방어 (레거시 브라우저용)
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // HTTPS 강제 (1년 + 서브도메인 포함)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // 권한 정책: 불필요한 브라우저 기능 비활성화
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  // X-Powered-By 헤더 제거 (기술 스택 노출 차단)
  poweredByHeader: false,

  // SEC-13: 보안 헤더 전역 적용
  headers: async () => [
    {
      source: '/(.*)',
      headers: SECURITY_HEADERS,
    },
  ],

  // next/image — Supabase Storage URL 허용 + AVIF/WebP 자동 변환
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
    deviceSizes: [640, 828, 1080, 1200, 1920],
    imageSizes: [40, 64, 128, 256, 512],
  },

  // Turbopack: 프로젝트 루트를 명시해 홈 디렉토리 package-lock.json 오인 방지
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
