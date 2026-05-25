/**
 * 공유 API (Sprint 3)
 * POST /api/share
 *
 * method: 'sms' | 'kakao' | 'link'
 * CoolSMS — API 키 미설정 시 mock 응답 반환
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const ShareSchema = z.object({
  method: z.enum(['sms', 'kakao', 'link']),
  projectId: z.string().uuid(),
  // SEC-12: PII 검증 — 한국 전화번호 형식만 허용 (임의 문자열로 외부 API 호출 방지)
  phone: z.string().regex(/^(\+82|0)1[0-9]-?\d{3,4}-?\d{4}$/, { message: '올바른 전화번호 형식이 아닙니다.' }).optional(),
  productName: z.string(),
  tagline: z.string(),
  shareUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await request.json()
    const parsed = ShareSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { method, projectId, phone, productName, tagline, shareUrl } = parsed.data

    // 공유 이벤트 기록 (channel = DB 컬럼명, target = 수신자)
    await supabase.from('shares').insert({
      project_id: projectId,
      user_id: user.id,
      channel: method,
      target: phone ?? null,
    })

    if (method === 'sms') {
      // CoolSMS 연동
      const result = await sendSMS({ phone: phone!, productName, tagline, shareUrl })
      return NextResponse.json({ success: true, messageId: result.messageId })
    }

    if (method === 'kakao') {
      // Kakao는 클라이언트 SDK에서 처리 (서버 미사용)
      return NextResponse.json({ success: true, method: 'kakao' })
    }

    // link copy — 서버 측 특별 처리 없음
    return NextResponse.json({ success: true, shareUrl })
  } catch (err) {
    console.error('[/api/share]', err)
    return NextResponse.json({ error: '공유 처리 중 오류' }, { status: 500 })
  }
}

// ─── CoolSMS 발송 ─────────────────────────────────────────────────────────────

async function sendSMS(params: {
  phone: string
  productName: string
  tagline: string
  shareUrl: string
}): Promise<{ messageId: string }> {
  const apiKey = process.env.COOLSMS_API_KEY
  const apiSecret = process.env.COOLSMS_API_SECRET
  const fromNumber = process.env.COOLSMS_FROM_NUMBER

  if (!apiKey || !apiSecret || !fromNumber) {
    // API 키 미설정 시 Mock 응답 (개발/스테이징 환경) — 전화번호 로그 금지
    console.log('[CoolSMS Mock] SMS skipped — keys not configured')
    return { messageId: `mock-${Date.now()}` }
  }

  // 실제 CoolSMS API 호출
  const timestamp = Date.now().toString()
  const { createHmac } = await import('crypto')
  const signature = createHmac('sha256', apiSecret)
    .update(`${timestamp}${apiKey}`)
    .digest('hex')

  const response = await fetch('https://api.coolsms.co.kr/messages/v4/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${timestamp}, salt=${timestamp}, signature=${signature}`,
    },
    body: JSON.stringify({
      message: {
        to: params.phone.replace(/-/g, ''),
        from: fromNumber,
        text: buildSMSText(params),
      },
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.message ?? 'CoolSMS 발송 실패')
  }

  const data = await response.json()
  return { messageId: data.groupId ?? `sms-${Date.now()}` }
}

function buildSMSText(params: { productName: string; tagline: string; shareUrl: string }): string {
  return `[ProductCraft AI]\n${params.productName}\n"${params.tagline}"\n\n상세보기: ${params.shareUrl}`
}
