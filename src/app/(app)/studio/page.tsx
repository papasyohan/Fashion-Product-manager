'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Sparkles, Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { UploadDropzone } from '@/components/upload-dropzone'
import { ResultCard } from '@/components/result-card'
import { ModeSelector } from '@/components/mode-selector'
import { CreditGuardModal } from '@/components/credit-guard-modal'
import { IntentForm } from '@/components/intent-form'
import { AnalysisReviewCard } from '@/components/analysis-review-card'
import { RefineBar } from '@/components/refine-bar'
import { createClient } from '@/lib/supabase/client'
import {
  useStudioStore,
  selectIsGenerating,
  selectStatusLabel,
  type StudioMode,
  type GenerationResult,
} from '@/store/studio'
import type { CreditGuardResult } from '@/lib/credit-guard'
import { consumePipelineSSE } from '@/lib/ai/sse-client'

// ─── 진행률 매핑 ─────────────────────────────────────────────────────────

const STATUS_PROGRESS: Record<string, number> = {
  idle: 0,
  uploading: 15,
  analyzing: 30,
  generating_names: 50,
  generating_tagline: 65,
  generating_description: 80,
  generating_thumbnails: 92,
  done: 100,
  error: 0,
}

// ─── 내부 컴포넌트 (useSearchParams 사용) ────────────────────────────────

function StudioPageInner() {
  const store = useStudioStore()
  const isGenerating = useStudioStore(selectIsGenerating)
  const searchParams = useSearchParams()
  const router = useRouter()

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [creditsLeft, setCreditsLeft] = useState(0)
  const [guardModal, setGuardModal] = useState<{
    open: boolean
    result: CreditGuardResult | null
    reason: 'insufficient_credits' | 'plan_required'
  }>({ open: false, result: null, reason: 'insufficient_credits' })

  // ─── 프로필 크레딧 로드 ────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('user_profiles')
        .select('credits_left')
        .eq('id', user.id)
        .single()
      if (data) setCreditsLeft(data.credits_left)
    }
    load()
  }, [])

  // ─── 히스토리에서 프로젝트 복원 (#3) ──────────────────────────────────
  // Phase 4: 명확한 로딩 상태 + 에러 처리
  const [historyLoadError, setHistoryLoadError] = useState<string | null>(null)
  const [historyProjectMeta, setHistoryProjectMeta] = useState<{
    imageUrl: string | null
    createdAt: string | null
  } | null>(null)

  useEffect(() => {
    const projectId = searchParams.get('projectId')
    // projectId 없으면 스킵 (신규 생성 흐름)
    if (!projectId) return

    const loadProject = async () => {
      // 이전 결과가 남아있어도 항상 초기화 후 재로드
      store.reset()
      // 즉시 로딩 상태로 전환 + 메타 표시
      store.setStatus('loading_history', 0)
      setHistoryLoadError(null)

      try {
        const supabase = createClient()
        const { data: project, error } = await supabase
          .from('projects')
          .select('id, mode, product_image_url, created_at, generations(type, payload)')
          .eq('id', projectId)
          .single()

        if (error) throw error
        if (!project) {
          throw new Error('프로젝트를 찾을 수 없습니다.')
        }

        // 미리 메타 표시 (썸네일 즉시 노출)
        setHistoryProjectMeta({
          imageUrl: project.product_image_url,
          createdAt: project.created_at,
        })

        type Gen = { type: string; payload: Record<string, unknown> }
        const gens = (project.generations as Gen[]) ?? []
        const naming   = gens.find((g) => g.type === 'naming')
        const taglineG = gens.find((g) => g.type === 'tagline')
        const descG    = gens.find((g) => g.type === 'description')
        const analyzeG = gens.find((g) => g.type === 'analyze')

        if (!naming || !taglineG || !descG) {
          throw new Error('이 프로젝트는 아직 생성이 완료되지 않았습니다.')
        }

        store.setMode(project.mode as StudioMode)
        store.setProjectId(projectId)
        if (project.product_image_url) store.setImage(project.product_image_url)

        store.setResult({
          names:       (naming.payload.names   as GenerationResult['names']) ?? [],
          tagline:     (taglineG.payload.tagline  as string) ?? '',
          description: (descG.payload.description as string) ?? '',
          selectedNameIndex: 0,
          category: analyzeG?.payload?.category   as string | undefined,
          keywords: analyzeG?.payload?.keywords   as string[] | undefined,
          features: analyzeG?.payload?.keyFeatures as string[] | undefined,
        })

        // URL 파라미터 정리
        router.replace('/studio')
      } catch (err) {
        console.error('[StudioPage] loadProject failed:', err)
        const message = err instanceof Error ? err.message : '불러오기 실패'
        setHistoryLoadError(message)
        store.setStatus('idle', 0)
      }
    }

    loadProject()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // ─── 업로드 완료 핸들러 ────────────────────────────────────────────────
  const handleUploadComplete = useCallback(
    async (imageUrl: string, base64: string) => {
      if (!store.mode) return
      store.setImage(imageUrl, base64)
      setErrorMsg(null)
      await runPipeline(imageUrl, base64, store.mode)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.mode]
  )

  // ─── 파이프라인 실행 (SSE 스트리밍) ─────────────────────────────────────
  const runPipeline = async (imageUrl: string, base64: string, mode: StudioMode) => {
    store.setStatus('analyzing', STATUS_PROGRESS.analyzing)

    // SSE 누적 상태
    let projectId: string | null = null
    let analysis: GenerationResult['features'] extends infer _ ? Record<string, unknown> | null : never
    analysis = null
    let names: GenerationResult['names'] = []
    let tagline = ''
    let descriptionBuffer = ''
    let highlights: string[] = []
    let analysisData: { category?: string; keywords?: string[]; keyFeatures?: string[]; targetAudience?: string } = {}

    try {
      const res = await fetch('/api/generate/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          imageBase64: base64,
          mode,
          // v1.1 — 사용자 의도 전달 (비어있으면 서버가 무시)
          userIntent: store.userIntent,
        }),
      })

      // 402 / 4xx → JSON 응답 (스트림 시작 전 차단)
      if (res.status === 402) {
        const err = await res.json()
        const gr = err.guardResult as CreditGuardResult
        store.setStatus('idle', 0)
        setGuardModal({
          open: true,
          result: gr,
          reason: gr?.reason?.includes('해상도') ? 'plan_required' : 'insufficient_credits',
        })
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'AI 생성 실패' }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      // ── SSE 이벤트 소비 ──────────────────────────────────────────────
      await consumePipelineSSE(res, (event) => {
        switch (event.type) {
          case 'progress': {
            // step → 클라이언트 상태 매핑
            const stepStatusMap = {
              project_create: 'uploading',
              analyze:        'analyzing',
              naming:         'generating_names',
              tagline:        'generating_tagline',
              description:    'generating_description',
            } as const
            const newStatus = stepStatusMap[event.step] ?? 'analyzing'
            store.setStatus(newStatus, event.percent)
            return
          }
          case 'project':
            projectId = event.projectId
            store.setProjectId(event.projectId)
            return
          case 'analysis':
            analysisData = event.data
            // v1.1 — 사이드바 노출용으로 store 에 원본 분석 저장
            store.setAnalysis({
              category: event.data.category,
              style: event.data.style,
              targetAudience: event.data.targetAudience,
              keyFeatures: event.data.keyFeatures,
              keywords: event.data.keywords,
            })
            return
          case 'names':
            names = event.data
            // Phase 2 — 1차 variant 로 저장 (덮어쓰지 않고 후속 재생성 시 누적)
            store.addNamingVariant(event.data)
            // 트렌드 키워드도 분석 사이드바에 노출
            store.setTrendKeywords(event.trendTags ?? [])
            return
          case 'tagline':
            tagline = event.data
            store.addTaglineVariant(event.data)
            return
          case 'description_chunk':
            descriptionBuffer += event.text
            // 부분 description 미리보기 — store에 progressive write
            store.setStatus('generating_description', Math.min(95, store.progress + 1))
            return
          case 'description_done':
            descriptionBuffer = event.data
            highlights = event.highlights
            store.addDescriptionVariant(event.data)
            return
          case 'error':
            throw new Error(event.message)
          case 'complete':
            // 본문 break — 아래에서 후처리
            return
        }
      })

      if (!projectId) throw new Error('projectId가 스트림에서 전달되지 않았습니다.')

      // ── 기본 결과 조립 ───────────────────────────────────────────────
      const result: GenerationResult = {
        names,
        tagline,
        description: descriptionBuffer,
        selectedNameIndex: 0,
        category: analysisData.category,
        keywords: analysisData.keywords,
        features: analysisData.keyFeatures,
      }
      void highlights // 현재 미사용 (추후 상세페이지 조립 시 활용)

      // ── 스튜디오 모드 썸네일 (별도 비-스트리밍 호출) ───────────────
      if (mode === 'studio') {
        store.setStatus('generating_thumbnails', STATUS_PROGRESS.generating_thumbnails)
        try {
          const thumbRes = await fetch('/api/generate/thumbnail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              imageBase64: base64,
              imageUrl,
              analysis: analysisData,
              aspectRatios: ['1:1', '4:5', '9:16', '16:9'],
              count: 1,
              resolution: '2K',
            }),
          })
          if (thumbRes.ok) {
            const thumbData = await thumbRes.json()
            const thumbs = (thumbData.thumbnails ?? []) as Array<{
              url: string; width: number; height: number; aspect_ratio: string
            }>
            result.thumbnails = thumbs.map((t) => ({
              ratio: t.aspect_ratio,
              label: t.aspect_ratio,
              size: `${t.width}×${t.height}`,
              url: t.url,
              width: t.width,
              height: t.height,
            }))
            result.primaryThumbnailUrl = thumbs[0]?.url
          } else if (thumbRes.status === 402) {
            console.warn('[pipeline] thumbnail credit guard — showing text results only')
          }
        } catch (thumbErr) {
          console.warn('[pipeline] thumbnail failed, showing text results:', thumbErr)
        }
      }

      store.setResult(result)
      setCreditsLeft((prev) => Math.max(prev - 1, 0))
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류'
      store.setError(message)
      setErrorMsg(message)
    }
  }

  // ─── v1.1: 인라인 편집 핸들러 ────────────────────────────────────────────
  const handleEditName = useCallback((index: number, newName: string) => {
    if (!store.result) return
    const updated = [...store.result.names]
    updated[index] = { ...updated[index], name: newName }
    store.patchResult({ names: updated })
  }, [store])

  const handleEditTagline = useCallback((newTagline: string) => {
    store.patchResult({ tagline: newTagline })
  }, [store])

  const handleEditDescription = useCallback((newDescription: string) => {
    store.patchResult({ description: newDescription })
  }, [store])

  // ─── v1.1: 부분 재생성 핸들러 (Phase 2 — addVariant 사용으로 변형 누적) ─
  const effectiveAnalysis = store.getEffectiveAnalysis()

  const handleRegenerateNaming = useCallback(async (refinement?: string) => {
    if (!store.projectId) return
    try {
      const res = await fetch('/api/generate/naming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: effectiveAnalysis.category ?? '상품',
          keywords: effectiveAnalysis.keywords ?? [],
          style: effectiveAnalysis.style,
          projectId: store.projectId,
          userIntent: store.userIntent,
          refinement,
        }),
      })
      if (!res.ok) throw new Error('상품명 재생성 실패')
      const data = await res.json()
      // Phase 2 — 덮어쓰지 않고 변형으로 누적
      store.addNamingVariant(data.names, refinement)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '재생성 실패')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.projectId, store.userIntent, effectiveAnalysis])

  const handleRegenerateTagline = useCallback(async (refinement?: string) => {
    if (!store.projectId || !store.result) return
    try {
      const primaryName = store.result.names[store.result.selectedNameIndex]?.name ?? ''
      const res = await fetch('/api/generate/tagline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: primaryName,
          category: effectiveAnalysis.category ?? '상품',
          keywords: effectiveAnalysis.keywords ?? [],
          projectId: store.projectId,
          userIntent: store.userIntent,
          refinement,
        }),
      })
      if (!res.ok) throw new Error('홍보문구 재생성 실패')
      const data = await res.json()
      store.addTaglineVariant(data.tagline, refinement)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '재생성 실패')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.projectId, store.userIntent, store.result, effectiveAnalysis])

  const handleRegenerateDescription = useCallback(async (refinement?: string) => {
    if (!store.projectId || !store.result || !store.mode) return
    try {
      const primaryName = store.result.names[store.result.selectedNameIndex]?.name ?? ''
      const res = await fetch('/api/generate/description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: primaryName,
          tagline: store.result.tagline,
          category: effectiveAnalysis.category ?? '상품',
          keywords: effectiveAnalysis.keywords ?? [],
          mode: store.mode,
          targetAudience: effectiveAnalysis.targetAudience,
          projectId: store.projectId,
          userIntent: store.userIntent,
          refinement,
        }),
      })
      if (!res.ok) throw new Error('상세설명 재생성 실패')
      const data = await res.json()
      store.addDescriptionVariant(data.description, refinement)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '재생성 실패')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.projectId, store.userIntent, store.result, store.mode, effectiveAnalysis])

  // Phase 2 — 전체 재생성 (잠긴 섹션은 스킵)
  const handleRegenerateAll = useCallback(async () => {
    const tasks: Promise<unknown>[] = []
    if (!store.locks.naming)      tasks.push(handleRegenerateNaming())
    if (!store.locks.tagline)     tasks.push(handleRegenerateTagline())
    if (!store.locks.description) tasks.push(handleRegenerateDescription())
    await Promise.all(tasks)
  }, [store.locks, handleRegenerateNaming, handleRegenerateTagline, handleRegenerateDescription])

  // Phase 3 — 자연어 Refine Bar: 여러 섹션 동시 재생성 (같은 refinement)
  const handleGlobalRefine = useCallback(async (
    refinement: string,
    targets: Array<'naming' | 'tagline' | 'description'>
  ) => {
    const tasks: Promise<unknown>[] = []
    if (targets.includes('naming'))      tasks.push(handleRegenerateNaming(refinement))
    if (targets.includes('tagline'))     tasks.push(handleRegenerateTagline(refinement))
    if (targets.includes('description')) tasks.push(handleRegenerateDescription(refinement))
    await Promise.all(tasks)
  }, [handleRegenerateNaming, handleRegenerateTagline, handleRegenerateDescription])

  // ─── Phase 4 — AI Fitting 핸들러 ────────────────────────────────────────
  // 마지막 모델 이미지 로드 (user_profiles.last_model_image_url 에서)
  const [lastModelImageUrl, setLastModelImageUrl] = useState<string | null>(null)
  useEffect(() => {
    const loadLastModel = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('user_profiles')
        .select('last_model_image_url')
        .eq('id', user.id)
        .single()
      if (data?.last_model_image_url) setLastModelImageUrl(data.last_model_image_url)
    }
    loadLastModel()
  }, [])

  const handleAIFitting = useCallback(async (aspectRatios: string[]) => {
    if (!store.projectId || !store.result) throw new Error('프로젝트가 없습니다.')
    if (!aspectRatios || aspectRatios.length === 0) throw new Error('비율을 선택해주세요.')

    // 모델 이미지 결정 우선순위:
    // 1. 막 업로드한 base64 (store.modelImageBase64)
    // 2. 현재 store 의 url
    // 3. 마지막 모델 URL (reuseLastModel = true 일 때)
    const useBase64 = store.modelImageBase64
    const useUrl = store.modelImageUrl ?? (store.reuseLastModel ? lastModelImageUrl : null)
    if (!useBase64 && !useUrl) throw new Error('모델 사진을 먼저 업로드해주세요.')

    const productImage = store.uploadedImageBase64 ?? store.uploadedImageUrl ?? null
    if (!productImage) throw new Error('원본 제품 이미지가 없습니다.')

    const res = await fetch('/api/generate/ai-fitting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: store.projectId,
        productImageBase64: store.uploadedImageBase64 ?? undefined,
        productImageUrl: !store.uploadedImageBase64 ? store.uploadedImageUrl : undefined,
        modelImageBase64: useBase64 ?? undefined,
        modelImageUrl: !useBase64 ? useUrl : undefined,
        aspectRatios,  // D안: 사용자가 선택한 비율만
        resolution: store.thumbnailResolution,
        category: effectiveAnalysis.category ?? '패션 아이템',
        productKeyFeatures: effectiveAnalysis.keyFeatures ?? [],
        saveAsLastModel: !!useBase64,  // base64 로 새로 올린 경우만 last_model 갱신
      }),
    })

    if (res.status === 402) {
      const err = await res.json()
      const gr = err.guardResult as CreditGuardResult
      setGuardModal({
        open: true,
        result: gr,
        reason: gr?.reason?.includes('Pro') ? 'plan_required' : 'insufficient_credits',
      })
      return
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'AI Fitting 실패' }))
      throw new Error(err.error ?? 'AI Fitting 실패')
    }
    const data = await res.json()
    // fittings 적용
    const items = (data.fittings ?? []).map((f: { result_url?: string; url?: string; aspect_ratio?: string; aspectRatio?: string; width: number; height: number; model_image_url?: string | null }) => ({
      url: f.result_url ?? f.url ?? '',
      aspectRatio: f.aspect_ratio ?? f.aspectRatio ?? '1:1',
      width: f.width,
      height: f.height,
      modelImageUrl: f.model_image_url ?? null,
    }))
    store.setAiFittings(items)
    // 마지막 모델 URL 갱신 (재사용 가능)
    if (data.modelImageUrl) {
      setLastModelImageUrl(data.modelImageUrl)
      store.setModelImage(data.modelImageUrl, null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.projectId, store.result, store.modelImageBase64, store.modelImageUrl, store.reuseLastModel, store.uploadedImageBase64, store.uploadedImageUrl, store.thumbnailResolution, lastModelImageUrl, effectiveAnalysis])

  // Phase 2 — 썸네일 핀 재롤
  const handleRerollThumbnails = useCallback(async (refinement: string) => {
    if (!store.projectId || !store.uploadedImageBase64 || !store.result) return
    try {
      const res = await fetch('/api/generate/thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: store.projectId,
          imageBase64: store.uploadedImageBase64,
          imageUrl: store.uploadedImageUrl,
          analysis: {
            category: effectiveAnalysis.category ?? '상품',
            colors: [],
            style: effectiveAnalysis.style ?? '',
            mood: '',
            keyFeatures: effectiveAnalysis.keyFeatures ?? [],
            keywords: effectiveAnalysis.keywords ?? [],
          },
          aspectRatios: ['1:1', '4:5', '9:16', '16:9'],
          pinnedAspectRatios: Array.from(store.pinnedAspectRatios),
          count: 1,
          resolution: store.thumbnailResolution,
          refinement: refinement || undefined,
        }),
      })
      if (!res.ok) {
        if (res.status === 402) {
          const err = await res.json()
          const gr = err.guardResult as CreditGuardResult
          setGuardModal({
            open: true,
            result: gr,
            reason: gr?.reason?.includes('해상도') ? 'plan_required' : 'insufficient_credits',
          })
          return
        }
        throw new Error('썸네일 재생성 실패')
      }
      const data = await res.json()
      const newThumbs = (data.thumbnails ?? []) as Array<{
        url: string; width: number; height: number; aspect_ratio: string
      }>
      // 핀 외 비율 결과를 기존 썸네일과 머지 (핀 비율은 유지)
      const pinnedSet = store.pinnedAspectRatios
      const merged = [
        ...(store.result.thumbnails ?? []).filter((t) => pinnedSet.has(t.ratio)),
        ...newThumbs.map((t) => ({
          ratio: t.aspect_ratio,
          label: t.aspect_ratio,
          size: `${t.width}×${t.height}`,
          url: t.url,
          width: t.width,
          height: t.height,
        })),
      ]
      store.patchResult({ thumbnails: merged, primaryThumbnailUrl: merged[0]?.url })
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '썸네일 재생성 실패')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.projectId, store.uploadedImageBase64, store.uploadedImageUrl, store.result, store.pinnedAspectRatios, store.thumbnailResolution, effectiveAnalysis])

  // ─── 결과 화면 ────────────────────────────────────────────────────────

  if (store.status === 'done' && store.result && store.mode) {
    return (
      <div className="pb-48"> {/* RefineBar sticky 공간 확보 */}
        <div className="bg-white sticky top-0 z-10" style={{ borderBottom: '1px solid #e5e5e5' }}>
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => store.reset()}
              className="text-[14px] font-medium text-[#707072] hover:text-[#111111] transition-colors"
            >
              ← 모드 선택으로
            </button>
            <span className="text-[11px] font-semibold text-[#9e9ea0] uppercase tracking-widest">
              {store.mode === 'quick' ? 'Quick Mode' : 'Studio Mode'}
            </span>
          </div>
        </div>

        {/* 결과 + 사이드바 (lg 이상 2단 레이아웃, 모바일은 사이드바가 floating drawer) */}
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 lg:flex lg:items-start lg:gap-6 lg:pt-6">
          <div className="flex-1 min-w-0">
            <ResultCard
              result={store.result}
              mode={store.mode}
              projectId={store.projectId}
              onSelectName={store.selectName}
              onRegenerate={() => store.reset()}
              onSave={() => router.push('/history')}
              onEditName={handleEditName}
              onEditTagline={handleEditTagline}
              onEditDescription={handleEditDescription}
              onRegenerateNaming={handleRegenerateNaming}
              onRegenerateTagline={handleRegenerateTagline}
              onRegenerateDescription={handleRegenerateDescription}

              // Phase 2
              variantsCount={{
                naming: store.variants.naming.length,
                tagline: store.variants.tagline.length,
                description: store.variants.description.length,
              }}
              variantsActive={store.activeIndex}
              variantsRefinements={{
                naming: store.variants.naming.map((v) => v.refinement),
                tagline: store.variants.tagline.map((v) => v.refinement),
                description: store.variants.description.map((v) => v.refinement),
              }}
              onSelectVariant={(kind, i) => {
                if (kind === 'naming')      store.selectNamingVariant(i)
                if (kind === 'tagline')     store.selectTaglineVariant(i)
                if (kind === 'description') store.selectDescriptionVariant(i)
              }}
              locks={store.locks}
              onToggleLock={store.toggleLock}
              onRegenerateAll={handleRegenerateAll}
              pinnedAspectRatios={store.pinnedAspectRatios}
              onTogglePin={store.togglePin}
              onRerollThumbnails={handleRerollThumbnails}
              detailPageSections={store.detailPageSections}
              onChangeDetailSections={store.setDetailPageSections}

              // Phase 4 — AI Fitting
              productImageUrl={store.uploadedImageUrl}
              lastModelImageUrl={lastModelImageUrl}
              currentModelBase64={store.modelImageBase64}
              currentModelUrl={store.modelImageUrl}
              reuseLastModel={store.reuseLastModel}
              onToggleReuseModel={store.toggleReuseLastModel}
              onModelUpload={(base64) => store.setModelImage(null, base64)}
              onModelClear={store.clearModelImage}
              onGenerateAIFitting={handleAIFitting}
              aiFittings={store.aiFittings}
              selectedFittingUrl={store.selectedFittingUrl}
              onSelectFittingHero={store.selectFittingHero}
            />
          </div>

          {/* L2 분석 사이드바 — 데스크탑 sticky, 모바일 drawer */}
          <AnalysisReviewCard
            analysis={effectiveAnalysis}
            onUpdate={store.updateAnalysis}
          />
        </div>

        {/* Phase 3 — 자연어 Refine Bar (결과 화면 하단 sticky) */}
        <RefineBar
          locks={store.locks}
          onSubmit={handleGlobalRefine}
        />

        {/* 크레딧 업그레이드 모달 */}
        {guardModal.open && guardModal.result && (
          <CreditGuardModal
            open={guardModal.open}
            onClose={() => setGuardModal((s) => ({ ...s, open: false }))}
            guardResult={guardModal.result}
            reason={guardModal.reason}
            creditsLeft={creditsLeft}
          />
        )}
      </div>
    )
  }

  // ─── 히스토리 로딩 화면 (Phase 4) ──────────────────────────────────────
  if (store.status === 'loading_history') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          {/* 히스토리 썸네일 미리보기 */}
          {historyProjectMeta?.imageUrl ? (
            <div
              className="w-32 h-32 mx-auto overflow-hidden mb-6 relative"
              style={{ border: '1px solid #e5e5e5' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={historyProjectMeta.imageUrl}
                alt="이전 작업 썸네일"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            </div>
          ) : (
            <div className="w-16 h-16 mx-auto bg-[#111111] flex items-center justify-center mb-6">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
          <h2 className="text-[22px] font-black text-[#111111] mb-2">
            이전 작업 불러오는 중
          </h2>
          <p className="text-[14px] text-[#707072]">
            히스토리에서 선택한 프로젝트를 복원하고 있습니다...
          </p>
        </div>
      </div>
    )
  }

  // ─── 히스토리 로딩 실패 화면 (Phase 4) ─────────────────────────────────
  if (historyLoadError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div
          className="max-w-md mx-auto p-8 text-center"
          style={{ border: '1px solid #fecaca', backgroundColor: '#fff5f5' }}
        >
          <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#d30005' }}>
            <span className="text-white text-2xl">!</span>
          </div>
          <h2 className="text-[20px] font-black text-[#111111] mb-2">
            프로젝트를 불러올 수 없습니다
          </h2>
          <p className="text-[13px] text-[#707072] mb-6">
            {historyLoadError}
          </p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => router.push('/history')}
              className="px-4 h-10 rounded-full text-[13px] font-semibold text-[#111111] hover:bg-white transition-colors"
              style={{ border: '1px solid #cacacb' }}
            >
              ← 히스토리로
            </button>
            <button
              onClick={() => {
                setHistoryLoadError(null)
                router.replace('/studio')
              }}
              className="px-4 h-10 rounded-full text-[13px] font-semibold text-white bg-[#111111] hover:bg-[#333333] transition-colors"
            >
              새로 시작
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── 생성 중 화면 ──────────────────────────────────────────────────────

  if (isGenerating) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 mx-auto bg-[#111111] flex items-center justify-center mb-6">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-[22px] font-black text-[#111111] mb-2">
            {selectStatusLabel(store.status)}
          </h2>
          <p className="text-[14px] text-[#707072] mb-6">
            {store.status === 'generating_thumbnails'
              ? '🍌 Nano Banana 2로 썸네일을 생성하고 있습니다...'
              : store.mode === 'quick'
              ? 'AI가 트렌드 키워드를 분석하고 있습니다...'
              : 'AI 에이전트들이 협력하여 콘텐츠를 생성합니다...'}
          </p>
          <Progress value={store.progress} className="h-1.5 rounded-none" />
          <p className="mt-3 text-[12px] text-[#9e9ea0]">{store.progress}%</p>
        </div>
      </div>
    )
  }

  // ─── 메인 선택 화면 ────────────────────────────────────────────────────

  return (
    <div>
      {/* Hero */}
      <section className="max-w-[1440px] mx-auto px-6 md:px-12 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#111111] text-white text-[11px] font-semibold mb-6">
          <Sparkles className="w-3 h-3" />
          신제품 등록, 30초의 혁명
        </div>
        <h1
          className="font-black text-[#111111] mb-4"
          style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.1 }}
        >
          사진 한 장으로 시작하는
          <br />
          <span className="italic text-[#707072]">팔리는 상품 콘텐츠</span>
        </h1>
        <p className="text-[15px] text-[#707072] max-w-xl mx-auto leading-relaxed">
          제품 이미지를 올리면 AI가 트렌드 키워드를 반영해 상품명, 한줄 카피,
          상세 설명까지 자동으로 만들어드립니다.
        </p>
      </section>

      {/* Mode Selection */}
      <section className="max-w-[1440px] mx-auto px-6 md:px-12 pb-10">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-[20px] font-black text-[#111111]">
            모드 선택{' '}
            <span className="text-[#9e9ea0] font-normal italic">— 무엇을 만들어드릴까요?</span>
          </h2>
          <span className="text-[12px] text-[#9e9ea0] hidden md:block">언제든 변경 가능</span>
        </div>

        <ModeSelector
          selectedMode={store.mode}
          onSelect={(m) => {
            store.setMode(m)
            // v1.1 — 모드 선택 즉시 의도 입력 단계로 전환
            store.setStatus('intent', 0)
          }}
          disabled={isGenerating}
        />

        {/* v1.1 — Step 2: IntentForm (모드 선택 후) */}
        {store.mode && store.status === 'intent' && (
          <div className="mt-6">
            <IntentForm
              initial={store.userIntent}
              onSubmit={(intent) => {
                store.setIntent(intent)
                store.setStatus('idle', 0) // 업로드 활성화
              }}
              onSkip={() => {
                store.clearIntent()
                store.setStatus('idle', 0)
              }}
            />
          </div>
        )}

        {errorMsg && (
          <div
            className="mt-4 p-4 text-[13px] text-[#d30005]"
            style={{ backgroundColor: '#fff5f5', border: '1px solid #fecaca' }}
          >
            {errorMsg}
          </div>
        )}

        {/* 업로드 영역 — 의도 단계 종료 후에만 활성화 */}
        {store.mode && store.status !== 'intent' && (
          <div className="mt-8">
            <UploadDropzone
              disabled={!store.mode || isGenerating}
              onUploadComplete={handleUploadComplete}
              onError={(msg) => setErrorMsg(msg)}
            />
            {/* 의도 요약 + 다시 수정 링크 */}
            {(store.userIntent.tone || store.userIntent.audience || store.userIntent.channel || store.userIntent.memo) && (
              <div className="mt-3 flex items-center justify-between p-3" style={{ backgroundColor: '#f5f5f5', border: '1px solid #e5e5e5' }}>
                <div className="text-[12px] text-[#707072] flex-1 truncate">
                  <span className="font-semibold text-[#111111]">의도 반영됨:</span>{' '}
                  {[store.userIntent.tone, store.userIntent.audience, store.userIntent.channel]
                    .filter(Boolean).join(' · ')}
                  {store.userIntent.memo && ` — "${store.userIntent.memo}"`}
                </div>
                <button
                  onClick={() => store.setStatus('intent', 0)}
                  className="ml-3 text-[11px] font-semibold text-[#707072] hover:text-[#111111] transition-colors shrink-0"
                >
                  ✎ 수정
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Behind the Scenes — Nike dark editorial tile, 0px radius */}
      <section className="max-w-[1440px] mx-auto px-6 md:px-12 pb-16">
        <div className="bg-[#111111] text-white p-10 md:p-14">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9e9ea0] mb-4">
            Behind the Scenes
          </div>
          <h2
            className="font-black text-white mb-3"
            style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', lineHeight: 1.1 }}
          >
            9개의 AI 에이전트가{' '}
            <span className="italic text-[#9e9ea0]">오토파일럿</span>으로
          </h2>
          <p className="text-[14px] text-[#9e9ea0] mb-8 max-w-xl">
            Spec → Test → Build → QA → Deploy. Claude Code 서브에이전트 오케스트레이션.
          </p>
          <div className="grid grid-cols-3 md:grid-cols-9 gap-2 mb-6">
            {['Spec', 'Test', 'Back', 'Front', 'AI Pipe', 'QA', 'Security', 'DevOps', 'Orchestrator'].map(
              (agent) => (
                <div
                  key={agent}
                  className="py-3 text-center text-[11px] font-medium text-[#9e9ea0]"
                  style={{ backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a' }}
                >
                  {agent}
                </div>
              )
            )}
          </div>
          <div className="pt-6 grid md:grid-cols-3 gap-4" style={{ borderTop: '1px solid #2a2a2a' }}>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#4b4b4d] mb-1">Text &amp; Vision</div>
              <div className="text-[14px] font-semibold text-white">Claude Sonnet 4.5</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#4b4b4d] mb-1">Image Generation</div>
              <div className="text-[14px] font-semibold text-white flex items-center gap-1.5 flex-wrap">
                🍌 Nano Banana 2
                <span className="text-[11px] font-normal text-[#707072]">(Gemini 3.1 Flash Image)</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#4b4b4d] mb-1">Infra</div>
              <div className="text-[14px] font-semibold text-white">Next.js 16 · Supabase · Vercel</div>
            </div>
          </div>
        </div>
      </section>

      {/* 크레딧 업그레이드 모달 */}
      {guardModal.open && guardModal.result && (
        <CreditGuardModal
          open={guardModal.open}
          onClose={() => setGuardModal((s) => ({ ...s, open: false }))}
          guardResult={guardModal.result}
          reason={guardModal.reason}
          creditsLeft={creditsLeft}
        />
      )}
    </div>
  )
}

// ─── 기본 export — Suspense 래핑 (useSearchParams 요구사항) ──────────────

export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      <StudioPageInner />
    </Suspense>
  )
}
