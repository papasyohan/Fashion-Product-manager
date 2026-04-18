/**
 * 상세페이지 HTML 자동 조립 API (Sprint 2 — G5)
 * POST /api/generate/detail-page
 *
 * 섹션: Hero / 핵심 특징 / 사용법 / 스펙 / 리뷰 플레이스홀더 / CTA
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// ─── 스키마 ─────────────────────────────────────────────────────────────────

const DetailPageSchema = z.object({
  projectId: z.string().uuid(),
  productName: z.string(),
  tagline: z.string(),
  description: z.string(),
  category: z.string(),
  keywords: z.array(z.string()),
  features: z.array(z.string()),
  thumbnailUrl: z.string().url().optional(),
  shopUrl: z.string().url().optional(),
})

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await request.json()
    const parsed = DetailPageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data
    const html = assembleDetailPage(data)

    // generations 테이블에 저장
    await supabase.from('generations').insert({
      project_id: data.projectId,
      type: 'detail_page',
      payload: { html, productName: data.productName } as unknown as Record<string, unknown>,
    })

    return NextResponse.json({ html, projectId: data.projectId })
  } catch (err) {
    console.error('[/api/generate/detail-page]', err)
    return NextResponse.json({ error: '상세페이지 생성 실패' }, { status: 500 })
  }
}

// ─── HTML 조립기 ─────────────────────────────────────────────────────────────

interface DetailPageInput {
  productName: string
  tagline: string
  description: string
  category: string
  keywords: string[]
  features: string[]
  thumbnailUrl?: string
  shopUrl?: string
}

function assembleDetailPage(d: DetailPageInput): string {
  const keywordsMetaContent = d.keywords.join(', ')
  const featuresHTML = d.features
    .slice(0, 6)
    .map(
      (f, i) => `
      <div class="feature-item">
        <div class="feature-num">${String(i + 1).padStart(2, '0')}</div>
        <p class="feature-text">${escapeHtml(f)}</p>
      </div>`
    )
    .join('')

  const keywordsHTML = d.keywords
    .slice(0, 8)
    .map((k) => `<span class="keyword-tag">${escapeHtml(k)}</span>`)
    .join('')

  const heroImgHTML = d.thumbnailUrl
    ? `<img src="${escapeHtml(d.thumbnailUrl)}" alt="${escapeHtml(d.productName)}" class="hero-img" />`
    : `<div class="hero-img hero-img-placeholder"><span>이미지</span></div>`

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="keywords" content="${escapeHtml(keywordsMetaContent)}">
<title>${escapeHtml(d.productName)} — 상세페이지</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Noto Sans KR', sans-serif; background: #fff; color: #1a1a1a; max-width: 860px; margin: 0 auto; }

  /* Hero */
  .hero { padding: 60px 32px; text-align: center; background: linear-gradient(135deg, #fef9f0 0%, #fdf2f8 100%); }
  .hero-category { display: inline-block; padding: 4px 14px; border-radius: 100px; background: rgba(245,158,11,.1); color: #b45309; font-size: 12px; font-weight: 600; letter-spacing: .5px; margin-bottom: 20px; }
  .hero-title { font-size: clamp(28px, 5vw, 44px); font-weight: 800; letter-spacing: -1px; margin-bottom: 16px; line-height: 1.2; }
  .hero-tagline { font-size: 18px; color: #6b6b80; max-width: 520px; margin: 0 auto 32px; line-height: 1.6; }
  .hero-img { width: 100%; max-width: 480px; border-radius: 20px; display: block; margin: 0 auto 32px; object-fit: cover; }
  .hero-img-placeholder { height: 320px; background: #f0f0ec; display: flex; align-items: center; justify-content: center; color: #bbb; font-size: 14px; }
  .cta-btn { display: inline-block; padding: 16px 40px; background: #1a1a1a; color: #fff; border-radius: 100px; font-weight: 700; font-size: 16px; text-decoration: none; letter-spacing: -.3px; }

  /* Features */
  .section { padding: 60px 32px; }
  .section-label { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #aaa; margin-bottom: 12px; }
  .section-title { font-size: 28px; font-weight: 800; letter-spacing: -.5px; margin-bottom: 32px; }
  .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
  .feature-item { padding: 24px; background: #f8f8f5; border-radius: 16px; }
  .feature-num { font-size: 32px; font-weight: 800; color: #e5e5e0; margin-bottom: 8px; line-height: 1; }
  .feature-text { font-size: 14px; color: #444; line-height: 1.7; }

  /* Description */
  .desc-section { padding: 60px 32px; background: #f8f8f5; }
  .desc-text { font-size: 15px; line-height: 1.9; color: #333; white-space: pre-line; }

  /* Keywords */
  .keywords-section { padding: 40px 32px; }
  .keywords-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
  .keyword-tag { padding: 6px 16px; border: 1px solid #e0e0dc; border-radius: 100px; font-size: 13px; color: #555; }

  /* Review placeholder */
  .review-section { padding: 60px 32px; background: #fff; }
  .review-placeholder { padding: 40px; border: 2px dashed #e5e5e0; border-radius: 20px; text-align: center; color: #bbb; }
  .review-placeholder p { font-size: 13px; }

  /* Footer */
  footer { padding: 32px; background: #1a1a1a; color: #666; font-size: 11px; text-align: center; line-height: 1.8; }
  footer strong { color: #aaa; }
</style>
</head>
<body>

<!-- 01. Hero -->
<section class="hero">
  <div class="hero-category">${escapeHtml(d.category)}</div>
  <h1 class="hero-title">${escapeHtml(d.productName)}</h1>
  <p class="hero-tagline">${escapeHtml(d.tagline)}</p>
  ${heroImgHTML}
  ${d.shopUrl ? `<a href="${escapeHtml(d.shopUrl)}" class="cta-btn">지금 구매하기 →</a>` : ''}
</section>

<!-- 02. 핵심 특징 -->
<section class="section">
  <div class="section-label">Key Features</div>
  <h2 class="section-title">이런 점이 특별합니다</h2>
  <div class="features-grid">
    ${featuresHTML}
  </div>
</section>

<!-- 03. 상세 설명 -->
<section class="desc-section">
  <div class="section-label">Product Story</div>
  <h2 class="section-title">상품 소개</h2>
  <p class="desc-text">${escapeHtml(d.description)}</p>
</section>

<!-- 04. 검색 키워드 -->
<section class="keywords-section">
  <div class="section-label">Search Keywords</div>
  <div class="keywords-wrap">
    ${keywordsHTML}
  </div>
</section>

<!-- 05. 리뷰 플레이스홀더 -->
<section class="review-section">
  <div class="section-label">Customer Reviews</div>
  <h2 class="section-title">고객 리뷰</h2>
  <div class="review-placeholder">
    <p>📦 첫 번째 구매자가 되어주세요!</p>
    <p style="margin-top:8px">구매 후 소중한 리뷰를 남겨주시면 다음 구매 시 적립금을 드립니다.</p>
  </div>
</section>

<!-- Footer -->
<footer>
  <strong>AI 생성 콘텐츠 고지</strong><br>
  이 상세페이지의 일부 콘텐츠는 ProductCraft AI (Claude Sonnet 4.5, Google Gemini)를 통해 자동 생성되었습니다.<br>
  생성된 이미지는 Google SynthID 워터마크를 포함하며, AI 생성 콘텐츠임을 식별할 수 있습니다.
</footer>

</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
