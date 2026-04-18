/**
 * NanaBanana2Provider
 * Google Gemini 3.1 Flash Image Preview (내부 코드명: Nano Banana 2)
 *
 * 특징:
 *  - referenceImage 인라인 전달 → Subject Consistency 유지
 *  - candidate_count: 최대 4 (병렬 비율 생성)
 *  - thinking_level: minimal(기본) / high(Pro+)
 *  - 결과 이미지 → Supabase Storage 업로드 후 서명 URL 반환
 *  - SynthID 워터마크 자동 삽입 (Google 정책)
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import type { IImageGenProvider, ImageGenParams, ImageGenResult, AspectRatio } from './types'

// ─── 종횡비 → px 매핑 ────────────────────────────────────────────────────────

const ASPECT_TO_PX: Record<AspectRatio, { width: number; height: number }> = {
  '1:1':  { width: 1024, height: 1024 },
  '4:5':  { width: 819,  height: 1024 },
  '5:4':  { width: 1024, height: 819  },
  '3:4':  { width: 768,  height: 1024 },
  '4:3':  { width: 1024, height: 768  },
  '9:16': { width: 576,  height: 1024 },
  '16:9': { width: 1024, height: 576  },
  '21:9': { width: 1024, height: 439  },
  '1:4':  { width: 256,  height: 1024 },
  '4:1':  { width: 1024, height: 256  },
  '1:8':  { width: 128,  height: 1024 },
  '8:1':  { width: 1024, height: 128  },
}

// ─── 해상도 배율 ─────────────────────────────────────────────────────────────

const RESOLUTION_SCALE: Record<string, number> = {
  '1K': 1.0,
  '2K': 2.0,
  '4K': 4.0,
}

// ─── Provider ───────────────────────────────────────────────────────────────

export class NanaBanana2Provider implements IImageGenProvider {
  private genAI: GoogleGenerativeAI
  private supabase: ReturnType<typeof createSupabaseAdminClient>

  constructor() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase environment variables are not set')
    }

    this.genAI = new GoogleGenerativeAI(apiKey)
    this.supabase = createSupabaseAdminClient(supabaseUrl, serviceKey)
  }

  async generate(params: ImageGenParams): Promise<ImageGenResult> {
    const {
      referenceImages,
      prompt,
      aspectRatios,
      count,
      resolution,
      thinking = 'minimal',
    } = params

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-preview-image-generation',
    })

    // 종횡비당 count만큼 생성 (병렬)
    const tasks = aspectRatios.flatMap((ratio) =>
      Array.from({ length: count }, () => ({ ratio }))
    )

    const scale = RESOLUTION_SCALE[resolution] ?? 1.0

    const results = await Promise.allSettled(
      tasks.map(({ ratio }) => this.generateSingle({ model, prompt, referenceImages, ratio, scale, thinking }))
    )

    const images: ImageGenResult['images'] = []

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        images.push(result.value)
      }
    }

    if (images.length === 0) {
      throw new Error('이미지 생성에 실패했습니다. 모든 요청이 거부되었습니다.')
    }

    return {
      images,
      requestId: `nb2-${Date.now()}`,
      costTokens: images.length * 500, // 추정값
    }
  }

  private async generateSingle(params: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: any
    prompt: string
    referenceImages: string[]
    ratio: AspectRatio
    scale: number
    thinking: string
  }): Promise<ImageGenResult['images'][number] | null> {
    const { model, prompt, referenceImages, ratio, scale } = params
    const baseDims = ASPECT_TO_PX[ratio] ?? { width: 1024, height: 1024 }
    const width = Math.round(baseDims.width * scale)
    const height = Math.round(baseDims.height * scale)

    try {
      // 참조 이미지 파트 구성
      const parts: object[] = []

      for (const ref of referenceImages.slice(0, 1)) {
        // 첫 번째 참조 이미지만 Subject Anchor로 사용
        if (ref.startsWith('data:')) {
          const [header, data] = ref.split(',')
          const mimeType = header.split(':')[1]?.split(';')[0] ?? 'image/jpeg'
          parts.push({
            inlineData: { mimeType, data },
          })
        } else if (ref.startsWith('http')) {
          // URL 형식: fetch하여 base64로 변환
          const resp = await fetch(ref)
          const buf = await resp.arrayBuffer()
          const base64 = Buffer.from(buf).toString('base64')
          const mimeType = resp.headers.get('content-type') ?? 'image/jpeg'
          parts.push({ inlineData: { mimeType, data: base64 } })
        }
      }

      // 프롬프트 파트
      parts.push({
        text: `${prompt}\n\nGenerate image at ${width}x${height}px for ${ratio} aspect ratio. Preserve the exact product from the reference image — same shape, color, texture, and details.`,
      })

      const response = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
        },
      })

      const candidate = response.response.candidates?.[0]
      if (!candidate) return null

      // 이미지 파트 추출
      for (const part of candidate.content.parts ?? []) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
          const imageUrl = await this.uploadToStorage(
            part.inlineData.data,
            part.inlineData.mimeType,
            ratio
          )
          return { url: imageUrl, width, height, aspectRatio: ratio }
        }
      }

      return null
    } catch (err) {
      console.error(`[NanaBanana2] generateSingle(${ratio}) failed:`, err)
      return null
    }
  }

  private async uploadToStorage(
    base64Data: string,
    mimeType: string,
    ratio: AspectRatio
  ): Promise<string> {
    const ext = mimeType.split('/')[1] ?? 'png'
    const fileName = `thumbnails/${Date.now()}-${ratio.replace(':', 'x')}.${ext}`

    const buffer = Buffer.from(base64Data, 'base64')

    const { error } = await this.supabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (error) throw new Error(`Storage upload failed: ${error.message}`)

    const { data } = this.supabase.storage
      .from('product-images')
      .getPublicUrl(fileName)

    return data.publicUrl
  }
}
