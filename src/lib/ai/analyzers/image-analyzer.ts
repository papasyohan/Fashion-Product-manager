/**
 * 이미지 분석 래퍼
 * Claude Vision으로 제품 이미지를 분석하여 구조화된 데이터를 반환
 */

import { analyzeWithVision, parseJsonResponse } from '@/lib/ai/client'
import {
  ANALYZE_SYSTEM_PROMPT,
  ANALYZE_USER_PROMPT,
} from '@/lib/prompts/analyze'

export interface AnalyzeResult {
  category: string
  subcategory: string
  colors: string[]
  materials: string[]
  style: string
  targetAudience: string
  keyFeatures: string[]
  keywords: string[]
  mood: string
  platform: string
}

export interface PreflightResult {
  passed: boolean
  errors: string[]
  warnings: string[]
}

/**
 * T-01: 제품 이미지 분석
 */
export async function analyzeProductImage(params: {
  imageUrl?: string
  imageBase64?: string
  mode: 'quick' | 'studio'
}): Promise<AnalyzeResult> {
  if (!params.imageUrl && !params.imageBase64) {
    throw new Error('imageUrl 또는 imageBase64 중 하나는 필수입니다.')
  }

  // URL 형식 검증
  if (params.imageUrl && !isValidUrl(params.imageUrl)) {
    throw new Error('유효하지 않은 이미지 URL입니다.')
  }

  const raw = await analyzeWithVision({
    imageUrl: params.imageUrl,
    imageBase64: params.imageBase64,
    systemPrompt: ANALYZE_SYSTEM_PROMPT,
    userPrompt: ANALYZE_USER_PROMPT,
    maxTokens: 1024,
  })

  return parseJsonResponse<AnalyzeResult>(raw)
}

/**
 * T-02: 이미지 사전 검사 (preflight)
 */
export async function preflightImageCheck(
  base64OrUrl: string
): Promise<PreflightResult> {
  const errors: string[] = []
  const warnings: string[] = []

  // base64 형식 검사
  if (base64OrUrl.startsWith('data:')) {
    const mimeMatch = base64OrUrl.match(/^data:(image\/[a-z]+);base64,/)
    if (!mimeMatch) {
      errors.push('지원하지 않는 이미지 형식입니다.')
      return { passed: false, errors, warnings }
    }

    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!supportedTypes.includes(mimeMatch[1])) {
      errors.push('해상도(resolution): JPG, PNG, WebP 형식만 지원합니다.')
    }

    // 파일 크기 추정 (base64 길이 × 0.75)
    const base64Data = base64OrUrl.split(',')[1] ?? ''
    const estimatedBytes = base64Data.length * 0.75
    const estimatedMB = estimatedBytes / (1024 * 1024)

    if (estimatedMB > 20) {
      errors.push('파일 크기는 20MB 이하여야 합니다.')
    }

    // base64가 너무 짧으면 유효하지 않은 이미지 (512px 기준)
    if (base64Data.length < 1000) {
      errors.push('해상도(resolution): 이미지 해상도가 너무 낮습니다. 최소 512×512px 이상이어야 합니다.')
    }
  } else if (!isValidUrl(base64OrUrl)) {
    errors.push('유효하지 않은 이미지 URL입니다.')
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  }
}

// ─── 유틸리티 ──────────────────────────────────────────────────────────────

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
