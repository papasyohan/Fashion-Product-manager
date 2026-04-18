'use client'

import { useState, useCallback } from 'react'
import {
  Sparkles, Zap, Wand2, Clock, Check, ArrowRight, Package, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { UploadDropzone } from '@/components/upload-dropzone'
import { ResultCard } from '@/components/result-card'
import {
  useStudioStore,
  selectIsGenerating,
  selectStatusLabel,
  type StudioMode,
} from '@/store/studio'

// ─── 모드 정의 ─────────────────────────────────────────────────────────────

const modes = [
  {
    id: 'quick' as StudioMode,
    title: '간편 모드',
    subtitle: 'Quick Mode',
    tag: '15~30초',
    icon: Zap,
    gradient: 'from-amber-400 via-orange-400 to-pink-400',
    description: '사진 한 장으로 상품명·한줄카피·상세설명까지 30초 안에',
    features: ['트렌드 반영 상품명 3종', '35자 이내 한줄 홍보문구', '400~600자 상세 설명'],
    badge: null,
  },
  {
    id: 'studio' as StudioMode,
    title: '스튜디오 모드',
    subtitle: 'Studio Mode',
    tag: '1~3분 · Pro',
    icon: Wand2,
    gradient: 'from-indigo-500 via-violet-500 to-fuchsia-500',
    description: '원본 제품을 유지한 채 합성·연출컷을 생성하고 상세페이지, 카톡 공유까지',
    features: [
      '간편 모드의 모든 산출물',
      'Nano Banana 2 · 2K~4K 썸네일 N장',
      '원본 제품 Subject Consistency 유지',
      '1:1·4:5·9:16 다중 비율 동시 생성',
      '상세페이지 자동 조립 + 카톡 공유',
    ],
    badge: '🍌 Powered by Nano Banana 2',
  },
]

// ─── 상태 라벨 + 진행률 ─────────────────────────────────────────────────────

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
      <div
        className="min-h-screen bg-stone-50"
        style={{ fontFamily: "'Instrument Serif', 'Noto Serif KR', Georgia, serif" }}
      >
        <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
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
        </header>
        <ResultCard
          result={store.result}
          mode={store.mode}
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
        className="min-h-screen bg-stone-50 flex items-center justify-center"
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
    <div
      className="min-h-screen bg-stone-50"
      style={{ fontFamily: "'Instrument Serif', 'Noto Serif KR', Georgia, serif" }}
    >
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-pink-500 flex items-center justify-center">
              <Package className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl tracking-tight">
              ProductCraft <span className="italic text-stone-500">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-xs font-sans text-yellow-900">
              <span>🍌</span>
              <span className="font-medium">Nano Banana 2</span>
            </div>
            <div className="text-xs text-stone-500 font-sans">
              크레딧 <span className="font-semibold text-stone-900">47</span>/50
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-10 text-center">
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
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl tracking-tight">
            모드 선택{' '}
            <span className="text-stone-400 italic">— 무엇을 만들어드릴까요?</span>
          </h2>
          <span className="text-xs text-stone-400 font-sans hidden md:block">언제든 변경 가능</span>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {modes.map((mode) => {
            const Icon = mode.icon
            const isSelected = store.mode === mode.id
            return (
              <button
                key={mode.id}
                onClick={() => store.setMode(mode.id)}
                className={`group relative text-left rounded-3xl border-2 transition-all duration-300 overflow-hidden ${
                  isSelected
                    ? 'border-stone-900 shadow-2xl scale-[1.01]'
                    : 'border-stone-200 hover:border-stone-400 hover:shadow-lg'
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${mode.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                <div className="relative p-7">
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center shadow-sm`}>
                      <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-[11px] font-sans font-medium">
                      <Clock className="w-3 h-3" />
                      {mode.tag}
                    </div>
                  </div>
                  <div className="mb-1 flex items-baseline gap-2">
                    <h3 className="text-3xl tracking-tight">{mode.title}</h3>
                    <span className="text-xs text-stone-400 font-sans uppercase tracking-widest">{mode.subtitle}</span>
                  </div>
                  <p className="text-stone-600 text-sm mb-5 font-sans leading-relaxed">{mode.description}</p>
                  {mode.badge && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-5 rounded-full bg-yellow-50 border border-yellow-200 text-[11px] font-sans font-semibold text-yellow-900">
                      {mode.badge}
                    </div>
                  )}
                  <ul className="space-y-2.5 mb-6">
                    {mode.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm font-sans text-stone-700">
                        <Check className="w-4 h-4 mt-0.5 text-stone-900 flex-shrink-0" strokeWidth={2.5} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className={`inline-flex items-center gap-2 text-sm font-sans font-semibold transition-colors ${isSelected ? 'text-stone-900' : 'text-stone-400 group-hover:text-stone-700'}`}>
                    {isSelected ? '선택됨' : '이 모드로 시작하기'}
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-5 right-5 w-6 h-6 rounded-full bg-stone-900 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            )
          })}
        </div>

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
            <div className="text-xs font-sans uppercase tracking-[0.2em] text-stone-400 mb-3">Behind the Scenes</div>
            <h2 className="text-4xl tracking-tight mb-2">
              9명의 AI 에이전트가 <span className="italic text-stone-300">오토파일럿</span>으로
            </h2>
            <p className="text-stone-400 font-sans mb-8 max-w-xl">
              Spec → Test → Build → QA → Deploy. Claude Code 서브에이전트 오케스트레이션.
            </p>
            <div className="grid grid-cols-3 md:grid-cols-9 gap-2 mb-6">
              {['Spec', 'Test', 'Back', 'Front', 'AI Pipe', 'QA', 'Security', 'DevOps', 'Orchestrator'].map(
                (agent) => (
                  <div key={agent} className="px-2 py-3 rounded-xl bg-stone-800 border border-stone-700 text-center text-[11px] font-sans font-medium">
                    {agent}
                  </div>
                )
              )}
            </div>
            <div className="pt-6 border-t border-stone-800 grid md:grid-cols-3 gap-4">
              <div>
                <div className="text-[10px] font-sans uppercase tracking-wider text-stone-500 mb-1">Text &amp; Vision</div>
                <div className="font-sans text-sm font-semibold">Claude Sonnet 4.5</div>
              </div>
              <div>
                <div className="text-[10px] font-sans uppercase tracking-wider text-stone-500 mb-1">Image Generation</div>
                <div className="font-sans text-sm font-semibold flex items-center gap-1.5 flex-wrap">
                  🍌 Nano Banana 2
                  <span className="text-[10px] font-normal text-stone-400">(Gemini 3.1 Flash Image)</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-sans uppercase tracking-wider text-stone-500 mb-1">Infra</div>
                <div className="font-sans text-sm font-semibold">Next.js 15 · Supabase · Vercel</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
