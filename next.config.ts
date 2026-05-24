import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // X-Powered-By 헤더 제거 (불필요한 정보 노출 차단)
  poweredByHeader: false,

  // next/image 에서 Supabase Storage URL 허용
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
};

export default nextConfig;
