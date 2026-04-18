'use client'

import { useState, useCallback } from 'react'
import { Sparkles, Package, Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { UploadDropzone } from '@/components/upload-dropzone'
import { ResultCard } from '@/components/result-card'
import { ModeSelector } from '@/components/mode-selector'
import {
  useStudioStore,
  selectIsGenerating,
  selectStatusLabel,
  type StudioMode,
} from '@/store/studio'

// ─── 진행률 매핑 ─────────────────────────────────────────────────────────

const STATUS_PROGRESS = {
  idle: 0,
  uploading: 15,
  analyzing: 30,
  generating_names: 55,
  generating_tagline: 70,
  generating_description: 85,
  generating_thumbnails: 92,
  done: 100,
  error: 0,
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────

export default function StudioPage() {
  const store = useStudioStore()
  const isGenerating = useStudioStore(selectIsGenerating)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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

  const runPipeline = async (
    imageUrl: string,
    base64: string,
    mode: StudioMode
  ) => {
    store.setStatus('analyzing', STATUS_PROGRESS.analyzing)

    try {
      const res = await fetch('/api/generate/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, imageBase64: base64, mode }),
      })

      store.setStatus('generating_names', STATUS_PROGRESS.generating_names)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'AI 생성 실패')
      }

      store.setStatus('generating_tagline', STATUS_PROGRESS.generating_tagline)
      const data = await res.json()

      store.setStatus('generating_description', STATUS_PROGRESS.generating_description)
      store.setProjectId(data.projectId)
      store.setResult({
        names: data.names,
        tagline: data.tagline,
        description: data.description,
        selectedNameIndex: 0,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류'
      store.setError(message)
      setErrorMsg(message)
    }
  }

  // ─── 결과 화면 ──────────────────────────────────────────────────────────

  if (store.status === 'done' && store.result && store.mode) {
    return (
      <div style={{ fontFamily: "'Instrument Serif', 'Noto Serif KR', Georgia, serif" }}>
        <div className="border-b border-stone-200 bg-white sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => store.reset()}
              className="text-sm font-sans text-stone-600 hover:text-stone-900"
            >
              ← 모드 선택으로
            </button>
            <span className="text-xs font-sans text-stone-400 uppercase tracking-widest">
              {store.mode === 'quick' ? 'Quick Mode' : 'Studio Mode'}
            </span>
          </div>
        </div>
        <ResultCard
          result={store.result}
          mode={store.mode}
          projectId={store.projectId}
          onSelectName={store.selectName}
          onRegenerate={() => store.reset()}
          onSave={() => alert('저장 기능은 Sprint 2에서 구현됩니다.')}
        />
      </div>
    )
  }

  // ─── 생성 중 화면 ────────────────────────────────────────────────────────

  if (isGenerating) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center"
        style={{ fontFamily: "'Instrument Serif', 'Noto Serif KR', Georgia, serif" }}
      >
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-stone-900 flex items-center justify-center mb-6">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-2xl tracking-tight mb-2">
            {selectStatusLabel(store.status)}
          </h2>
          <p className="text-sm font-sans text-stone-500 mb-6">
            {store.mode === 'quick'
              ? 'AI가 트렌드 키워드를 분석하고 있습니다...'
              : 'AI 에이전트들이 협력하여 콘텐츠를 생성합니다...'}
          </p>
          <Progress value={store.progress} className="h-2 rounded-full" />
          <p className="mt-3 text-xs font-sans text-stone-400">{store.progress}%</p>
        </div>
      </div>
    )
  }

  // ─── 메인 선택 화면 ─────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "'Instrument Serif', 'Noto Serif KR', Georgia, serif" }}>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900 text-stone-50 text-xs font-sans mb-6">
          <Sparkles className="w-3 h-3" />
          신제품 등록, 30초의 혁명
        </div>
        <h1 className="text-5xl md:text-6xl leading-tight tracking-tight text-stone-900">
          사진 한 장으로 시작하는
          <br />
          <span className="italic text-stone-600">팔리는 상품 콘텐츠</span>
        </h1>
        <p className="mt-6 text-stone-500 font-sans text-base max-w-xl mx-auto">
          제품 이미지를 올리면 AI가 트렌드 키워드를 반영해 상품명, 한줄 카피,
          상세 설명까지 자동으로 만들어드립니다.
        </p>
      </section>

      {/* Mode Selection */}
      <section className="max-w-6xl mx-auto px-6 pb-10">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl tracking-tight">
            모드 선택{' '}
            <span className="text-stone-400 italic">— 무엇을 만들어드릴까요?</span>
          </h2>
          <span className="text-xs text-stone-400 font-sans hidden md:block">언제든 변경 가능</span>
        </div>

        <ModeSelector
          selectedMode={store.mode}
          onSelect={store.setMode}
          disabled={isGenerating}
        />

        {/* 에러 메시지 */}
        {errorMsg && (
          <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm font-sans text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Upload Dropzone */}
        <div className="mt-8">
          <UploadDropzone
            disabled={!store.mode}
            onUploadComplete={handleUploadComplete}
            onError={(msg) => setErrorMsg(msg)}
          />
        </div>
      </section>

      {/* Behind the Scenes */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-3xl bg-stone-900 text-stone-50 p-10 md:p-14 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-400/20 to-pink-500/20 blur-3xl rounded-full" />
          <div className="relative">
            <div className="text-xs font-sans uppercase tracking-[0.2em] text-stone-400 mb-3">
              Behind the Scenes
            </div>
            <h2 className="text-4xl tracking-tight mb-2">
              9명의 AI 에이전트가{' '}
              <span className="italic text-stone-300">오토파일럿</span>으로
            </h2>
            <p className="text-stone-400 font-sans mb-8 max-w-xl">
              Spec → Test → Build → QA → Deploy. Claude Code 서브에이전트 오케스트레이션.
            </p>
            <div className="grid grid-cols-3 md:grid-cols-9 gap-2 mb-6">
              {['Spec', 'Test', 'Back', 'Front', 'AI Pipe', 'QA', 'Security', 'DevOps', 'Orchestrator'].map(
                (agent) => (
                  <div
                    key={agent}
                    className="px-2 py-3 rounded-xl bg-stone-800 border border-stone-700 text-center text-[11px] font-sans font-medium"
                  >
                    {agent}
                  </div>
                )
              )}
            </div>
            <div className="pt-6 border-t border-stone-800 grid md:grid-cols-3 gap-4">
              <div>
                <div className="text-[10px] font-sans uppercase tracking-wider text-stone-500 mb-1">
                  Text &amp; Vision
                </div>
                <div className="font-sans text-sm font-semibold">Claude Sonnet 4.5</div>
              </div>
              <div>
                <div className="text-[10px] font-sans uppercase tracking-wider text-stone-500 mb-1">
                  Image Generation
                </div>
                <div className="font-sans text-sm font-semibold flex items-center gap-1.5 flex-wrap">
                  🍌 Nano Banana 2
                  <span className="text-[10px] font-normal text-stone-400">
                    (Gemini 3.1 Flash Image)
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-sans uppercase tracking-wider text-stone-500 mb-1">
                  Infra
                </div>
                <div className="font-sans text-sm font-semibold">
                  Next.js 16 · Supabase · Vercel
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
