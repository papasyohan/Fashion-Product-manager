import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateProductNames } from '@/lib/ai/generators/naming-agent'
import { fetchTrendKeywords } from '@/lib/trends/trend-fetcher'

const NamingSchema = z.object({
  category: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  style: z.string().optional(),
  platform: z.string().optional(),
  projectId: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await request.json()
    const parsed = NamingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { category, keywords, style, platform, projectId } = parsed.data

    // 트렌드 키워드 병렬 fetch
    const { keywords: trendKeywords } = await fetchTrendKeywords({ category })

    const result = await generateProductNames({
      category,
      keywords,
      trendKeywords,
      style,
      platform,
    })

    if (projectId) {
      await supabase.from('generations').insert({
        project_id: projectId,
        type: 'naming',
        payload: result as unknown as Record<string, unknown>,
      })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/generate/naming]', err)
    return NextResponse.json({ error: '상품명 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
