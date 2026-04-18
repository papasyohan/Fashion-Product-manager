import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { analyzeProductImage } from '@/lib/ai/analyzers/image-analyzer'

const AnalyzeSchema = z.object({
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional(),
  projectId: z.string().uuid().optional(),
  mode: z.enum(['quick', 'studio']).default('quick'),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await request.json()
    const parsed = AnalyzeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { imageUrl, imageBase64, projectId, mode } = parsed.data

    const result = await analyzeProductImage({ imageUrl, imageBase64, mode })

    // DB 저장 (projectId 있을 때)
    if (projectId) {
      await supabase.from('generations').insert({
        project_id: projectId,
        type: 'analyze',
        payload: result as unknown as Record<string, unknown>,
      })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/generate/analyze]', err)
    return NextResponse.json({ error: '분석 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
