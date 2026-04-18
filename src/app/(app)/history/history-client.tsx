'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Zap, Wand2, Clock, ImageOff, ChevronRight, Trash2 } from 'lucide-react'

interface Generation {
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
}

interface Project {
  id: string
  mode: string
  status: string
  product_image_url: string | null
  created_at: string
  updated_at: string
  generations: Generation[]
}

interface Props {
  projects: Project[]
}

export function HistoryClient({ projects }: Props) {
  const [filter, setFilter] = useState<'all' | 'quick' | 'studio'>('all')

  const filtered = filter === 'all' ? projects : projects.filter((p) => p.mode === filter)

  const getProductName = (p: Project): string => {
    const naming = p.generations?.find((g) => g.type === 'naming')
    const names = naming?.payload?.names as Array<{ name: string }> | undefined
    return names?.[0]?.name ?? '상품명 없음'
  }

  const getTagline = (p: Project): string => {
    const tagline = p.generations?.find((g) => g.type === 'tagline')
    return (tagline?.payload?.tagline as string) ?? ''
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div
      className="max-w-5xl mx-auto px-6 py-10"
      style={{ fontFamily: "'Instrument Serif', 'Noto Serif KR', Georgia, serif" }}
    >
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-4xl tracking-tight mb-2">
          히스토리 <span className="italic text-stone-400">— 생성 내역</span>
        </h1>
        <p className="text-sm text-stone-500 font-sans">
          최근 50건의 AI 생성 내역을 확인할 수 있습니다.
        </p>
      </div>

      {/* 필터 탭 */}
      <div className="flex items-center gap-2 mb-6">
        {(['all', 'quick', 'studio'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-sans transition-colors ${
              filter === f
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {f === 'all' ? '전체' : f === 'quick' ? '간편 모드' : '스튜디오 모드'}
          </button>
        ))}
        <span className="ml-auto text-xs font-sans text-stone-400">
          {filtered.length}건
        </span>
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-stone-400" />
          </div>
          <p className="text-stone-500 font-sans">생성 내역이 없습니다.</p>
          <Link
            href="/studio"
            className="mt-4 inline-block text-sm font-sans font-semibold text-stone-900 hover:underline"
          >
            스튜디오로 이동 →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((project) => {
            const productName = getProductName(project)
            const tagline = getTagline(project)
            const ModeIcon = project.mode === 'quick' ? Zap : Wand2
            const modeColor =
              project.mode === 'quick'
                ? 'text-amber-600 bg-amber-50'
                : 'text-violet-600 bg-violet-50'

            return (
              <div
                key={project.id}
                className="group rounded-2xl border border-stone-200 bg-white p-5 hover:border-stone-400 hover:shadow-sm transition-all flex items-center gap-4"
              >
                {/* 썸네일 */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
                  {project.product_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.product_image_url}
                      alt={productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="w-5 h-5 text-stone-300" />
                    </div>
                  )}
                </div>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold ${modeColor}`}
                    >
                      <ModeIcon className="w-3 h-3" />
                      {project.mode === 'quick' ? '간편' : '스튜디오'}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-sans ${
                        project.status === 'done'
                          ? 'text-green-700 bg-green-50'
                          : project.status === 'processing'
                          ? 'text-yellow-700 bg-yellow-50'
                          : 'text-red-600 bg-red-50'
                      }`}
                    >
                      {project.status === 'done'
                        ? '완료'
                        : project.status === 'processing'
                        ? '생성중'
                        : '오류'}
                    </span>
                  </div>
                  <p className="text-lg tracking-tight truncate">{productName}</p>
                  {tagline && (
                    <p className="text-xs font-sans text-stone-500 truncate mt-0.5">
                      &ldquo;{tagline}&rdquo;
                    </p>
                  )}
                  <p className="text-[10px] font-sans text-stone-400 mt-1">
                    {formatDate(project.created_at)}
                  </p>
                </div>

                {/* 액션 */}
                <div className="flex items-center gap-2">
                  <button
                    className="p-2 rounded-full text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    title="삭제"
                    onClick={(e) => {
                      e.preventDefault()
                      // TODO: 삭제 확인 모달 → Sprint 4
                      alert('삭제 기능은 Sprint 4에서 구현됩니다.')
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <Link
                    href={`/studio?projectId=${project.id}`}
                    className="p-2 rounded-full text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                    title="다시 열기"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
