/**
 * ProductCraft AI — 통합 AI 클라이언트 래퍼
 * 모든 AI 호출은 반드시 이 파일을 경유 (직접 SDK 호출 금지)
 */

import Anthropic from '@anthropic-ai/sdk'
import type { IImageGenProvider } from './image/types'

let _claudeClient: Anthropic | null = null
let _imageProvider: IImageGenProvider | null = null

export function getClaudeClient(): Anthropic {
  if (!_claudeClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
    _claudeClient = new Anthropic({ apiKey })
  }
  return _claudeClient
}

export function getImageProvider(): IImageGenProvider {
  if (!_imageProvider) throw new Error('Image provider not initialized.')
  return _imageProvider
}

export function setImageProvider(provider: IImageGenProvider): void {
  _imageProvider = provider
}

/** Claude Vision으로 이미지 + 텍스트 분석 */
export async function analyzeWithVision(params: {
  imageUrl?: string
  imageBase64?: string
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
}): Promise<string> {
  const client = getClaudeClient()

  const imageSource = params.imageBase64
    ? {
        type: 'base64' as const,
        media_type: extractMimeType(params.imageBase64),
        data: extractBase64Data(params.imageBase64),
      }
    : params.imageUrl
    ? { type: 'url' as const, url: params.imageUrl }
    : null

  const content: Anthropic.MessageParam['content'] = imageSource
    ? [
        { type: 'image', source: imageSource },
        { type: 'text', text: params.userPrompt },
      ]
    : params.userPrompt

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: params.maxTokens ?? 1024,
    system: params.systemPrompt,
    messages: [{ role: 'user', content }],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type')
  return block.text
}

/** Claude 텍스트 전용 호출 */
export async function callClaude(params: {
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
}): Promise<string> {
  const client = getClaudeClient()

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: params.maxTokens ?? 1024,
    system: params.systemPrompt,
    messages: [{ role: 'user', content: params.userPrompt }],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type')
  return block.text
}

/** JSON 파싱 (마크다운 코드블록 자동 제거) */
export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  return JSON.parse(cleaned) as T
}

// ─── 유틸리티 ──────────────────────────────────────────────────────────────

function extractMimeType(
  base64: string
): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  const match = base64.match(/^data:(image\/[a-z]+);base64,/)
  const mime = match?.[1]
  if (
    mime === 'image/jpeg' ||
    mime === 'image/png' ||
    mime === 'image/webp' ||
    mime === 'image/gif'
  )
    return mime
  return 'image/jpeg'
}

function extractBase64Data(base64: string): string {
  return base64.replace(/^data:image\/[a-z]+;base64,/, '')
}
