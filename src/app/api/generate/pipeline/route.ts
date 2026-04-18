/**
 * 간편 모드 전체 파이프라인 API (I-01: ≤ 30초 목표)
 * analyze → naming + trends → tagline → description 순차 실행
 * POST /api/generate/pipeline
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { analyzeProductImage } from '@/lib/ai/analyzers/image-analyzer'
import { generateProductNames } from '@/lib/ai/generators/naming-agent'
import { generateTagline } from '@/lib/ai/generators/tagline-agent'
import { generateDescription } from '@/lib/ai/generators/description-agent'
import { fetchTrendKeywords } from '@/lib/trends/trend-fetcher'

const PipelineSchema = z.object({
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional(),
  mode: z.enum(['quick', 'studio']).default('quick'),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await request.json()
    const parsed = PipelineSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { imageUrl, imageBase64, mode } = parsed.data

    // ─── 프로젝트 생성 ───────────────────────────────────────────────────
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        mode,
        product_image_url: imageUrl ?? null,
        status: 'processing',
      })
      .select('id')
      .single()

    if (projectError || !project) {
      console.error('Project creation error:', projectError)
      return NextResponse.json({ error: '프로젝트 생성 실패' }, { status: 500 })
    }

    const projectId = project.id

    // ─── Step 1: 이미지 분석 ────────────────────────────────────────────
    const analysis = await analyzeProductImage({ imageUrl, imageBase64, mode })

    await supabase.from('generations').insert({
      project_id: projectId,
      type: 'analyze',
      payload: analysis as unknown as Record<string, unknown>,
    })

    // ─── Step 2: 트렌드 키워드 + 상품명 병렬 ──────────────────────────
    const [{ keywords: trendKeywords }, namingResult] = await Promise.all([
      fetchTrendKeywords({ category: analysis.category }),
      generateProductNames({
        category: analysis.category,
        keywords: analysis.keywords,
        trendKeywords: [],
        style: analysis.style,
        platform: analysis.platform,
      }),
    ])

    // 트렌드 반영 최종 상품명 (trendKeywords 포함 재생성은 생략 — 30초 내 완료 우선)
    await supabase.from('generations').insert({
      project_id: projectId,
      type: 'naming',
      payload: { ...namingResult, trendKeywords } as unknown as Record<string, unknown>,
    })

    // ─── Step 3: 홍보문구 (첫 번째 상품명 기준) ──────────────────────
    const primaryName = namingResult.names[0]?.name ?? analysis.category
    const taglineResult = await generateTagline({
      productName: primaryName,
      category: analysis.category,
      keywords: analysis.keywords,
      mood: analysis.mood,
    })

    await supabase.from('generations').insert({
      project_id: projectId,
      type: 'tagline',
      payload: taglineResult as unknown as Record<string, unknown>,
    })

    // ─── Step 4: 상세 설명 ────────────────────────────────────────────
    const descResult = await generateDescription({
      productName: primaryName,
      tagline: taglineResult.tagline,
      category: analysis.category,
      keywords: analysis.keywords,
      mode,
      targetAudience: analysis.targetAudience,
    })

    await supabase.from('generations').insert({
      project_id: projectId,
      type: 'description',
      payload: descResult as unknown as Record<string, unknown>,
    })

    // ─── 프로젝트 완료 ────────────────────────────────────────────────
    await supabase
      .from('projects')
      .update({ status: 'done', updated_at: new Date().toISOString() })
      .eq('id', projectId)

    const elapsed = Date.now() - startTime
    console.log(`[pipeline] ${mode} mode completed in ${elapsed}ms`)

    return NextResponse.json({
      projectId,
      analysis,
      names: namingResult.names,
      trendTags: namingResult.trendTags,
      tagline: taglineResult.tagline,
      description: descResult.description,
      highlights: descResult.highlights,
      elapsedMs: elapsed,
    })
  } catch (err) {
    console.error('[/api/generate/pipeline]', err)
    return NextResponse.json(
      { error: 'AI 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
