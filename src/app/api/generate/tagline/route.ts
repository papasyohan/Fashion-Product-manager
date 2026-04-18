import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateTagline } from '@/lib/ai/generators/tagline-agent'

const TaglineSchema = z.object({
  productName: z.string().min(1),
  category: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  mood: z.string().optional(),
  projectId: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await request.json()
    const parsed = TaglineSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { productName, category, keywords, mood, projectId } = parsed.data
    const result = await generateTagline({ productName, category, keywords, mood })

    if (projectId) {
      await supabase.from('generations').insert({
        project_id: projectId,
        type: 'tagline',
        payload: result as unknown as Record<string, unknown>,
      })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/generate/tagline]', err)
    return NextResponse.json({ error: '홍보문구 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
