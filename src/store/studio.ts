'use client'

import { create } from 'zustand'
import type { UserIntent } from '@/lib/ai/types'

// ─── 타입 정의 ─────────────────────────────────────────────────────────────

export type StudioMode = 'quick' | 'studio'

export type StudioStatus =
  | 'idle'
  | 'intent'   // v1.1 — L1: 모드 선택 후 의도 입력 단계
  | 'uploading'
  | 'analyzing'
  | 'generating_names'
  | 'generating_tagline'
  | 'generating_description'
  | 'generating_thumbnails'
  | 'done'
  | 'error'

// v1.1 — L2 사용자 분석 보정 (Override)
export interface AnalysisOverride {
  category?: string
  style?: string
  targetAudience?: string
  keyFeatures?: string[]
  keywords?: string[]
}

export interface ProductName {
  name: string
  trend: string
}

export interface GenerationResult {
  names: ProductName[]
  tagline: string
  description: string
  thumbnails?: ThumbnailResult[]
  selectedNameIndex: number
  /** 상세페이지 조립용 부가 메타데이터 (analyze 단계 결과) */
  category?: string
  keywords?: string[]
  features?: string[]
  /** 썸네일 중 대표 이미지 URL — 상세페이지 Hero에 삽입 */
  primaryThumbnailUrl?: string
}

export interface ThumbnailResult {
  ratio: string
  label: string
  size: string
  url?: string
  width?: number
  height?: number
}

export interface StudioStore {
  // ─── 상태 ──────────────────────────────────────────────────────────────
  mode: StudioMode | null
  uploadedImageUrl: string | null
  uploadedImageBase64: string | null
  projectId: string | null
  status: StudioStatus
  progress: number            // 0–100 진행률
  errorMessage: string | null
  result: GenerationResult | null

  // v1.1 — 사용자 의도 (L1) + 분석 보정 (L2)
  userIntent: UserIntent
  /** AI 가 추출한 원본 분석 (변경하지 않고 보관) */
  analysisOriginal: {
    category?: string
    style?: string
    targetAudience?: string
    keyFeatures?: string[]
    keywords?: string[]
  } | null
  /** 사용자가 수정한 필드만 담는 patch (analysisOriginal 위에 덮어쓰기) */
  analysisOverride: AnalysisOverride
  /** 인라인 편집된 generation id 추적 — DB user_edited 동기화용 */
  userEditedIds: Set<string>

  // ─── Actions ───────────────────────────────────────────────────────────
  setMode: (mode: StudioMode) => void
  setImage: (url: string, base64?: string) => void
  setProjectId: (id: string) => void
  setStatus: (status: StudioStatus, progress?: number) => void
  setResult: (result: GenerationResult) => void
  selectName: (index: number) => void
  setError: (message: string) => void
  reset: () => void

  // v1.1
  setIntent: (intent: Partial<UserIntent>) => void
  clearIntent: () => void
  setAnalysis: (analysis: NonNullable<StudioStore['analysisOriginal']>) => void
  updateAnalysis: (patch: Partial<AnalysisOverride>) => void
  /** Original + Override 머지 결과 — UI/API 호출 시 사용 */
  getEffectiveAnalysis: () => AnalysisOverride
  markEdited: (genId: string) => void
  /** 결과의 특정 부분만 갱신 (인라인 편집 / 부분 재생성) */
  patchResult: (patch: Partial<GenerationResult>) => void
}

// ─── 초기 상태 ─────────────────────────────────────────────────────────────

const initialState = {
  mode: null,
  uploadedImageUrl: null,
  uploadedImageBase64: null,
  projectId: null,
  status: 'idle' as StudioStatus,
  progress: 0,
  errorMessage: null,
  result: null,
  userIntent: {} as UserIntent,
  analysisOriginal: null,
  analysisOverride: {} as AnalysisOverride,
  userEditedIds: new Set<string>(),
}

// ─── Store 정의 (전역 1개만 허용) ──────────────────────────────────────────

export const useStudioStore = create<StudioStore>((set, get) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),

  setImage: (url, base64) =>
    set({ uploadedImageUrl: url, uploadedImageBase64: base64 ?? null }),

  setProjectId: (id) => set({ projectId: id }),

  setStatus: (status, progress) =>
    set((state) => ({
      status,
      progress: progress ?? state.progress,
      errorMessage: status === 'error' ? state.errorMessage : null,
    })),

  setResult: (result) => set({ result, status: 'done', progress: 100 }),

  selectName: (index) =>
    set((state) =>
      state.result
        ? { result: { ...state.result, selectedNameIndex: index } }
        : {}
    ),

  setError: (message) =>
    set({ status: 'error', errorMessage: message }),

  reset: () => set({ ...initialState, userEditedIds: new Set<string>() }),

  // v1.1
  setIntent: (patch) =>
    set((state) => ({ userIntent: { ...state.userIntent, ...patch } })),
  clearIntent: () => set({ userIntent: {} }),

  setAnalysis: (analysis) => set({ analysisOriginal: analysis }),

  updateAnalysis: (patch) =>
    set((state) => ({ analysisOverride: { ...state.analysisOverride, ...patch } })),

  getEffectiveAnalysis: () => {
    const { analysisOriginal, analysisOverride } = get()
    return { ...(analysisOriginal ?? {}), ...analysisOverride }
  },

  markEdited: (genId) =>
    set((state) => ({ userEditedIds: new Set(state.userEditedIds).add(genId) })),

  patchResult: (patch) =>
    set((state) => (state.result ? { result: { ...state.result, ...patch } } : {})),
}))

// ─── 편의 셀렉터 ───────────────────────────────────────────────────────────

export const selectIsGenerating = (state: StudioStore) =>
  ['uploading', 'analyzing', 'generating_names', 'generating_tagline',
   'generating_description', 'generating_thumbnails'].includes(state.status)

export const selectStatusLabel = (status: StudioStatus): string => {
  const labels: Record<StudioStatus, string> = {
    idle: '대기 중',
    intent: '의도 입력 중',
    uploading: '이미지 업로드 중...',
    analyzing: '이미지 분석 중...',
    generating_names: '상품명 생성 중...',
    generating_tagline: '홍보문구 생성 중...',
    generating_description: '상세설명 작성 중...',
    generating_thumbnails: '썸네일 생성 중...',
    done: '완료',
    error: '오류 발생',
  }
  return labels[status]
}
