'use client'

import { create } from 'zustand'

// ─── 타입 정의 ─────────────────────────────────────────────────────────────

export type StudioMode = 'quick' | 'studio'

export type StudioStatus =
  | 'idle'
  | 'uploading'
  | 'analyzing'
  | 'generating_names'
  | 'generating_tagline'
  | 'generating_description'
  | 'generating_thumbnails'
  | 'done'
  | 'error'

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

  // ─── Actions ───────────────────────────────────────────────────────────
  setMode: (mode: StudioMode) => void
  setImage: (url: string, base64?: string) => void
  setProjectId: (id: string) => void
  setStatus: (status: StudioStatus, progress?: number) => void
  setResult: (result: GenerationResult) => void
  selectName: (index: number) => void
  setError: (message: string) => void
  reset: () => void
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
}

// ─── Store 정의 (전역 1개만 허용) ──────────────────────────────────────────

export const useStudioStore = create<StudioStore>((set) => ({
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

  reset: () => set(initialState),
}))

// ─── 편의 셀렉터 ───────────────────────────────────────────────────────────

export const selectIsGenerating = (state: StudioStore) =>
  ['uploading', 'analyzing', 'generating_names', 'generating_tagline',
   'generating_description', 'generating_thumbnails'].includes(state.status)

export const selectStatusLabel = (status: StudioStatus): string => {
  const labels: Record<StudioStatus, string> = {
    idle: '대기 중',
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
