/**
 * 5계층 프롬프트 조립기 (ai-pipeline-dev)
 *
 * Layer 순서:
 *   [1] Subject Anchor  — 원본 제품 일관성 유지
 *   [2] Scene           — 배경·공간
 *   [3] Mood / Style    — 한국 쇼핑몰 스타일 가이드
 *   [4] Composition     — 구도·앵글 (종횡비별 최적화)
 *   [5] TextOverlay     — 한글 배지 (선택)
 */

import type { AspectRatio } from './types'

export interface PromptLayers {
  /** [1] 원본 제품 유지 — Subject Anchor */
  subjectAnchor: string
  /** [2] 배경·공간 설정 */
  scene: string
  /** [3] 무드·스타일 (한국 쇼핑몰 스타일 가이드 기반) */
  moodStyle: string
  /** [4] 구도·앵글 (종횡비별 최적화) */
  composition: string
  /** [5] 텍스트 삽입 (한글 배지, 선택사항) */
  textOverlay?: string
}

// ─── 종횡비별 기본 구도 사전 ─────────────────────────────────────────────────

const ASPECT_RATIO_COMPOSITION: Record<AspectRatio, string> = {
  '1:1':  'square framing, centered product placement, equal white space on all sides',
  '4:5':  'portrait crop, product in upper-center, subtle background gradient below',
  '5:4':  'slight landscape, product centered, breathing room on left and right',
  '3:4':  'tall portrait, product fills 60% of frame, negative space above and below',
  '4:3':  'standard landscape, product slightly left of center, contextual scene on right',
  '9:16': 'vertical mobile-first, product in upper-third, text/CTA space at bottom',
  '16:9': 'cinematic widescreen, product in rule-of-thirds left, expansive scene background',
  '21:9': 'ultra-wide banner, product small and precise, immersive panoramic backdrop',
  '1:4':  'vertical strip, product stacked top-to-bottom, editorial tower composition',
  '4:1':  'horizontal banner, product left-aligned, wide scene stretching right',
  '1:8':  'extreme vertical strip, sequential product detail shots stacked',
  '8:1':  'extreme horizontal strip, product at left anchor, sweeping landscape',
}

// ─── 한국 쇼핑몰 무드 사전 ───────────────────────────────────────────────────

const KOREAN_SHOPPING_MOOD_MAP: Record<string, string> = {
  minimal:    'clean minimal Korean e-commerce style, pure white background, soft diffused lighting, product-first clarity',
  premium:    'luxury editorial style, moody dramatic lighting, deep shadows, sophisticated color palette',
  casual:     'bright airy lifestyle, natural daylight, warm neutral tones, approachable and friendly',
  sporty:     'dynamic action-oriented, high contrast, bold shadows, energetic composition',
  natural:    'organic earthy tones, soft bokeh background, warm golden-hour glow, eco-conscious feel',
  feminine:   'pastel palette, delicate lighting, floral or textile textures, soft romantic mood',
  functional: 'clean technical product shot, neutral grey background, sharp details, utility-focused',
}

// ─── 공공 네거티브 프롬프트 ──────────────────────────────────────────────────

const GLOBAL_NEGATIVE_PROMPT =
  'deformed, blurry, low quality, watermark, text artifacts, misshapen product, ' +
  'duplicate objects, extra limbs, cropped product, overexposed, underexposed'

// ─── buildImagePrompt ────────────────────────────────────────────────────────

/**
 * 5계층을 조립하여 최종 이미지 생성 프롬프트를 반환합니다.
 * Gemini 3.1 Flash Image Preview (Nano Banana 2) 최적화 형식.
 *
 * @param layers - 5개 계층 프롬프트 구성 요소
 * @returns 조립된 최종 프롬프트 문자열
 */
export function buildImagePrompt(layers: PromptLayers): string {
  const parts: string[] = []

  // [1] Subject Anchor — 반드시 가장 먼저 기입 (모델이 제품을 anchor로 인식)
  parts.push(`SUBJECT: ${layers.subjectAnchor.trim()}`)

  // [2] Scene
  parts.push(`SCENE: ${layers.scene.trim()}`)

  // [3] Mood / Style
  parts.push(`STYLE: ${layers.moodStyle.trim()}`)

  // [4] Composition
  parts.push(`COMPOSITION: ${layers.composition.trim()}`)

  // [5] TextOverlay (선택)
  if (layers.textOverlay?.trim()) {
    parts.push(`TEXT OVERLAY: ${layers.textOverlay.trim()}`)
  }

  // 네거티브 프롬프트를 끝에 명시
  parts.push(`NEGATIVE: ${GLOBAL_NEGATIVE_PROMPT}`)

  return parts.join('\n')
}

// ─── buildPromptLayers: AnalyzeResult → PromptLayers 자동 조립 ──────────────

export interface BuildLayersInput {
  /** image-analyzer 분석 결과 */
  category: string
  colors: string[]
  style: string
  mood: string
  keyFeatures: string[]
  keywords: string[]
  /** 사용자 선택 종횡비 (기본: '4:5') */
  aspectRatio?: AspectRatio
  /** 커스텀 배경 설명 (없으면 자동 생성) */
  customScene?: string
  /** 한글 배지 텍스트 */
  overlayText?: string
}

/**
 * 분석 결과와 파라미터를 받아 5계층 레이어를 자동으로 조립합니다.
 * buildImagePrompt()와 함께 사용합니다.
 */
export function buildPromptLayers(input: BuildLayersInput): PromptLayers {
  const ratio = input.aspectRatio ?? '4:5'

  // [1] Subject Anchor — 제품의 핵심 정체성 보존
  const subjectAnchor = [
    `the exact same ${input.category}`,
    input.colors.length > 0 ? `in ${input.colors.slice(0, 2).join(' and ')}` : '',
    input.keyFeatures.length > 0 ? `with ${input.keyFeatures.slice(0, 2).join(', ')}` : '',
    '— preserve original product appearance, shape, color, and all distinguishing details exactly',
  ]
    .filter(Boolean)
    .join(' ')

  // [2] Scene — 배경 설정
  const scene =
    input.customScene?.trim() ||
    buildAutoScene(input.style, input.mood)

  // [3] Mood / Style — 한국 쇼핑몰 스타일
  const moodKey = normalizeMoodKey(input.mood)
  const moodStyle =
    KOREAN_SHOPPING_MOOD_MAP[moodKey] ??
    `${input.mood} style, professional product photography, Korean e-commerce optimized`

  // [4] Composition — 종횡비별 구도
  const composition = ASPECT_RATIO_COMPOSITION[ratio]

  // [5] TextOverlay
  const textOverlay = input.overlayText

  return { subjectAnchor, scene, moodStyle, composition, textOverlay }
}

// ─── 내부 유틸 ────────────────────────────────────────────────────────────────

function buildAutoScene(style: string, mood: string): string {
  const sceneParts: string[] = []

  if (/premium|luxury|high.?end/i.test(style + mood)) {
    sceneParts.push('sleek marble surface, subtle gradient background in soft grey and white')
  } else if (/natural|organic|eco/i.test(style + mood)) {
    sceneParts.push('wooden table surface, soft green foliage in background, natural diffused light')
  } else if (/casual|lifestyle|everyday/i.test(style + mood)) {
    sceneParts.push('light linen fabric surface, airy indoor setting with soft window light')
  } else if (/sport|active|dynamic/i.test(style + mood)) {
    sceneParts.push('textured concrete surface, dramatic directional lighting, dark vignette edges')
  } else {
    // 기본: 미니멀 스튜디오
    sceneParts.push('pure white seamless studio background, soft even lighting from above-left')
  }

  return sceneParts.join(', ')
}

function normalizeMoodKey(mood: string): string {
  const lower = mood.toLowerCase()
  if (/minimal|clean|simple/.test(lower)) return 'minimal'
  if (/premium|luxury|high.?end/.test(lower)) return 'premium'
  if (/casual|everyday|friendly/.test(lower)) return 'casual'
  if (/sport|active|dynamic|energy/.test(lower)) return 'sporty'
  if (/natural|organic|eco|earth/.test(lower)) return 'natural'
  if (/feminine|cute|romantic|soft/.test(lower)) return 'feminine'
  if (/functional|technical|utility/.test(lower)) return 'functional'
  return 'minimal'
}
