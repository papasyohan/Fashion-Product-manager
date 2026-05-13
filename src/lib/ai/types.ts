/**
 * AI 라우터 타입 정의
 * 작업(task) → 모델 매핑, 스트리밍 이벤트 타입, Zod 스키마
 */

import { z } from 'zod'

// ─── 작업 식별자 (env 키 prefix) ────────────────────────────────────────────

export type AITask =
  | 'analyze'      // 이미지→메타데이터 (vision)
  | 'naming'       // 상품명 3종
  | 'tagline'      // 35자 한줄카피
  | 'description'  // 400~800자 상세설명
  | 'detail_page'  // (현재 미사용, 추후 LLM HTML 조립 시)

export type AIProvider = 'anthropic' | 'google' | 'local'

/** `provider:model-id` 형식 (예: "anthropic:claude-sonnet-4-5") */
export type ModelSpec = string

// ─── 구조화 출력 스키마 (Zod) ───────────────────────────────────────────────

export const AnalyzeSchema = z.object({
  category: z.string().describe('제품 카테고리 (예: 텀블러, 티셔츠)'),
  subcategory: z.string().describe('세부 카테고리'),
  colors: z.array(z.string()).describe('주요 색상 (1~3개)'),
  materials: z.array(z.string()).describe('소재 (1~3개)'),
  style: z.string().describe('스타일 (미니멀, 캐주얼, 프리미엄 등)'),
  targetAudience: z.string().describe('주요 타깃 고객층'),
  keyFeatures: z.array(z.string()).describe('핵심 특징 3~5개'),
  keywords: z.array(z.string()).describe('SEO 키워드 5~8개'),
  mood: z.string().describe('제품 무드'),
  platform: z.string().describe('최적 판매 플랫폼 (쿠팡/네이버/무신사 중 1개)'),
})
export type AnalyzeOutput = z.infer<typeof AnalyzeSchema>

export const NamingSchema = z.object({
  names: z
    .array(
      z.object({
        name: z.string().describe('상품명 (40자 이내)'),
        trend: z.string().describe('해시태그 (#태그1 #태그2 형식)'),
      })
    )
    .length(3)
    .describe('상품명 3개 (가성비/감성/기능 각도)'),
})
export type NamingOutput = z.infer<typeof NamingSchema>

export const TaglineSchema = z.object({
  tagline: z.string().max(35).describe('한줄 홍보문구 (35자 이내)'),
  seoKeywords: z.array(z.string()).describe('포함된 SEO 키워드'),
})
export type TaglineOutput = z.infer<typeof TaglineSchema>

export const DescriptionSchema = z.object({
  description: z.string().describe('상세 설명 본문 (스펙은 · 기호로 구분)'),
  highlights: z.array(z.string()).describe('핵심 셀링포인트 3~5개'),
})
export type DescriptionOutput = z.infer<typeof DescriptionSchema>

// ─── 파이프라인 SSE 이벤트 ──────────────────────────────────────────────────

export type PipelineEvent =
  | { type: 'progress'; step: PipelineStep; percent: number }
  | { type: 'project'; projectId: string }
  | { type: 'analysis'; data: AnalyzeOutput }
  | { type: 'names'; data: NamingOutput['names']; trendTags: string[] }
  | { type: 'tagline'; data: string }
  | { type: 'description_chunk'; text: string }
  | { type: 'description_done'; data: string; highlights: string[] }
  | { type: 'complete'; elapsedMs: number }
  | { type: 'error'; message: string; step?: PipelineStep; status?: number }

export type PipelineStep =
  | 'project_create'
  | 'analyze'
  | 'naming'
  | 'tagline'
  | 'description'
