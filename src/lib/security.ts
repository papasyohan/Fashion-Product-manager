/**
 * 보안 유틸리티 모듈
 *
 * 전체 API에서 공통으로 사용하는 입력 검증·필터링 함수 모음.
 * Edge Runtime 호환 (Node.js API 미사용).
 */

// ─── SSRF 방어: 사용자 제공 imageUrl 화이트리스트 ──────────────────────────────
// SEC-02: imageUrl을 AI 모델에 fetch하기 전 내부 네트워크 차단

/** 허용 프로토콜 */
const ALLOWED_PROTOCOLS = new Set(['https:'])

/**
 * SSRF 방어용 내부 네트워크 패턴.
 * AWS/GCP/Azure 메타데이터 서버, RFC-1918 사설망, 루프백 전부 차단.
 */
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,                         // IPv4 루프백
  /^10\./,                          // RFC-1918 클래스 A
  /^172\.(1[6-9]|2\d|3[01])\./,    // RFC-1918 클래스 B
  /^192\.168\./,                    // RFC-1918 클래스 C
  /^169\.254\./,                    // APIPA / AWS·GCP 메타데이터 서버
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,  // CGNAT (RFC-6598)
  /^::1$/,                          // IPv6 루프백
  /^\[::1\]$/,
  /^0\./,                           // 현재 네트워크 (RFC-1122)
  /^fd[0-9a-f]{2}:/i,              // IPv6 ULA
]

/**
 * 사용자 제공 URL이 SSRF 공격에 사용될 수 없는 안전한 외부 이미지 URL인지 검증.
 *
 * - https: 프로토콜만 허용
 * - 사설 IP / 루프백 / 메타데이터 서버 차단
 * - 파싱 실패 시 false 반환 (방어적)
 */
export function isSafeImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return false
    const hostname = parsed.hostname.toLowerCase()
    return !PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname))
  } catch {
    return false
  }
}

// ─── Open Redirect 방어 ───────────────────────────────────────────────────────
// SEC-01: auth callback의 `next` 파라미터 검증

/**
 * `next` 리다이렉트 파라미터가 자사 도메인 내 경로인지 검증.
 *
 * 허용: `/studio`, `/history`, `/billing` 등 `/`로 시작하는 상대 경로
 * 거부: `//evil.com`, `https://evil.com`, `\evil.com`, 빈 문자열
 */
export function sanitizeRedirectPath(path: string | null | undefined, fallback = '/studio'): string {
  if (!path) return fallback
  // 상대 경로: `/`로 시작하되 `//`(프로토콜 상대 URL)·`\`(경로 조작)는 거부
  if (path.startsWith('/') && !path.startsWith('//') && !path.includes('\\')) {
    return path
  }
  return fallback
}

// ─── imageBase64 크기 제한 ────────────────────────────────────────────────────
// SEC-08: 무제한 base64 전송으로 인한 서버 메모리 고갈 방지

/** base64 문자열 최대 허용 바이트 (20MB 파일 → base64 ≈ 26.7MB 문자열) */
export const MAX_BASE64_LENGTH = 27_000_000

// ─── 이미지 MIME 타입 화이트리스트 ───────────────────────────────────────────
// SEC-04: 사용자 제공 MIME 타입 검증 (SVG·SVG+XML 등 XSS 벡터 차단)

export const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * base64 data URI에서 MIME 타입을 추출하고 화이트리스트 검증.
 * 통과 시 MIME 타입 문자열 반환, 실패 시 null 반환.
 */
export function extractSafeMimeType(base64DataUri: string): string | null {
  const match = base64DataUri.match(/^data:(image\/[a-z0-9+.-]+);base64,/)
  if (!match) return null
  const mimeType = match[1]
  return ALLOWED_IMAGE_MIMES.has(mimeType) ? mimeType : null
}

// ─── 에러 메시지 sanitize ─────────────────────────────────────────────────────
// SEC-11: DB 내부 에러 코드·힌트·테이블명이 클라이언트에 노출되지 않도록

/**
 * 서버 에러를 사용자 친화적 메시지로 변환.
 * 프로덕션에서는 내부 DB 코드/힌트 미노출, 개발 환경에서는 전체 표시.
 */
export function sanitizeErrorMessage(err: unknown, fallback = '처리 중 오류가 발생했습니다.'): string {
  const isDev = process.env.NODE_ENV === 'development'

  if (err instanceof Error) {
    // 개발 환경: 전체 메시지 노출
    if (isDev) return err.message
    // 프로덕션: AI API 크레딧·할당량 등 사용자가 조치 가능한 메시지만 허용
    if (/credit|quota|rate.?limit|timeout|billing/i.test(err.message)) return err.message
    return fallback
  }

  if (err && typeof err === 'object') {
    const e = err as { message?: string; code?: string; hint?: string; details?: string }
    if (isDev) {
      const msg = e.message ?? e.details ?? e.hint ?? JSON.stringify(err)
      return e.code ? `[${e.code}] ${msg}` : msg
    }
    // 프로덕션: Supabase 에러 코드·hint 미노출
    return fallback
  }

  return isDev ? String(err) : fallback
}
