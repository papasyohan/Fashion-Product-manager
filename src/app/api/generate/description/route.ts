import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateDescription } from '@/lib/ai/generators/description-agent'

const DescriptionSchema = z.object({
  productName: z.string().min(1),
  tagline: z.string().min(1),
  category: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  mode: z.enum(['quick', 'studio']).default('quick'),
  targetAudience: z.string().optional(),
  projectId: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await request.json()
    const parsed = DescriptionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { productName, tagline, category, keywords, mode, targetAudience, projectId } =
      parsed.data

    const result = await generateDescription({
      productName, tagline, category, keywords, mode, targetAudience,
    })

    if (projectId) {
      await supabase.from('generations').insert({
        project_id: projectId,
        type: 'description',
        payload: result as unknown as Record<string, unknown>,
      })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/generate/description]', err)
    return NextResponse.json({ error: '상세설명 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
