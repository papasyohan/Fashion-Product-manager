/**
 * Supabase 브라우저 클라이언트 (클라이언트 컴포넌트용)
 */
import { createBrowserClient } from '@supabase/ssr'

// TODO: Supabase 연결 후 `pnpm dlx supabase gen types` 실행하여 타입 자동 생성
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
