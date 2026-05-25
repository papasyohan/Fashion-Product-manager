import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sanitizeRedirectPath } from '@/lib/security'

/**
 * OAuth 콜백 핸들러 — Google 로그인 후 세션 교환
 *
 * SEC-01: `next` 파라미터를 sanitizeRedirectPath()로 검증하여
 *         Open Redirect(외부 도메인으로의 리다이렉트) 차단.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // SEC-01: 상대 경로만 허용 — //evil.com, https://evil.com, \evil.com 차단
  const next = sanitizeRedirectPath(searchParams.get('next'), '/studio')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
