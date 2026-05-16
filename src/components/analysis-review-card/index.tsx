'use client'

/**
 * AnalysisReviewCard — v1.1 UX Customization L2 (Analysis Review)
 *
 * B=1 결정: 자동 진행 + 사이드바 노출 + 사후 편집
 * - 분석 완료 직후 흐름을 멈추지 않고 다음 단계 진행
 * - 결과 화면 우측에 사이드바로 분석 결과 표시
 * - 클릭하여 카테고리/키워드/타깃/특징 사후 편집 가능
 * - 편집 후 "다시 생성" 토스트가 트리거됨 (이 컴포넌트는 onUpdate 만 호출, 재생성은 부모 책임)
 */

import { useState } from 'react'
import { Eye, X, Plus, Check } from 'lucide-react'
import type { AnalysisOverride } from '@/store/studio'

interface AnalysisReviewCardProps {
  /** 현재 effective analysis (original + override 머지 결과) */
  analysis: AnalysisOverride
  onUpdate: (patch: Partial<AnalysisOverride>) => void
  /** 모바일 drawer 상태 */
  defaultOpen?: boolean
}

export function AnalysisReviewCard({ analysis, onUpdate, defaultOpen = false }: AnalysisReviewCardProps) {
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(defaultOpen)

  // 편집 중인 로컬 상태 (저장 시에만 onUpdate)
  const [draftCategory, setDraftCategory]     = useState(analysis.category ?? '')
  const [draftStyle, setDraftStyle]           = useState(analysis.style ?? '')
  const [draftAudience, setDraftAudience]     = useState(analysis.targetAudience ?? '')
  const [draftFeatures, setDraftFeatures]     = useState<string[]>(analysis.keyFeatures ?? [])
  const [draftKeywords, setDraftKeywords]     = useState<string[]>(analysis.keywords ?? [])
  const [newFeature, setNewFeature] = useState('')
  const [newKeyword, setNewKeyword] = useState('')

  const startEdit = () => {
    setDraftCategory(analysis.category ?? '')
    setDraftStyle(analysis.style ?? '')
    setDraftAudience(analysis.targetAudience ?? '')
    setDraftFeatures(analysis.keyFeatures ?? [])
    setDraftKeywords(analysis.keywords ?? [])
    setEditing(true)
  }

  const cancelEdit = () => setEditing(false)

  const saveEdit = () => {
    onUpdate({
      category: draftCategory.trim() || undefined,
      style: draftStyle.trim() || undefined,
      targetAudience: draftAudience.trim() || undefined,
      keyFeatures: draftFeatures.filter((f) => f.trim().length > 0),
      keywords: draftKeywords.filter((k) => k.trim().length > 0),
    })
    setEditing(false)
  }

  const hasAny = !!(analysis.category || analysis.style || analysis.targetAudience ||
                    (analysis.keyFeatures && analysis.keyFeatures.length) ||
                    (analysis.keywords && analysis.keywords.length))

  if (!hasAny) return null

  return (
    <>
      {/* 데스크탑: 사이드바 (sticky) */}
      <aside
        className="hidden lg:block w-[280px] flex-shrink-0 sticky self-start"
        style={{ top: '5rem' }}
      >
        <Panel
          analysis={analysis}
          editing={editing}
          draftCategory={draftCategory}     setDraftCategory={setDraftCategory}
          draftStyle={draftStyle}           setDraftStyle={setDraftStyle}
          draftAudience={draftAudience}     setDraftAudience={setDraftAudience}
          draftFeatures={draftFeatures}     setDraftFeatures={setDraftFeatures}
          draftKeywords={draftKeywords}     setDraftKeywords={setDraftKeywords}
          newFeature={newFeature}           setNewFeature={setNewFeature}
          newKeyword={newKeyword}           setNewKeyword={setNewKeyword}
          startEdit={startEdit} cancelEdit={cancelEdit} saveEdit={saveEdit}
        />
      </aside>

      {/* 모바일: 하단 collapsible drawer */}
      <div className="lg:hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="fixed bottom-4 right-4 z-30 flex items-center gap-1.5 px-4 h-10 rounded-full bg-[#111111] text-white text-[12px] font-semibold shadow-lg"
        >
          <Eye className="w-4 h-4" />
          AI 분석 결과
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed bottom-0 left-0 right-0 z-50 bg-white max-h-[85vh] overflow-y-auto"
              style={{ borderTop: '1px solid #e5e5e5' }}
            >
              <Panel
                analysis={analysis}
                editing={editing}
                draftCategory={draftCategory}     setDraftCategory={setDraftCategory}
                draftStyle={draftStyle}           setDraftStyle={setDraftStyle}
                draftAudience={draftAudience}     setDraftAudience={setDraftAudience}
                draftFeatures={draftFeatures}     setDraftFeatures={setDraftFeatures}
                draftKeywords={draftKeywords}     setDraftKeywords={setDraftKeywords}
                newFeature={newFeature}           setNewFeature={setNewFeature}
                newKeyword={newKeyword}           setNewKeyword={setNewKeyword}
                startEdit={startEdit} cancelEdit={cancelEdit} saveEdit={saveEdit}
                onClose={() => setOpen(false)}
              />
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ─── 패널 본체 ─────────────────────────────────────────────────────────────

interface PanelProps {
  analysis: AnalysisOverride
  editing: boolean
  draftCategory: string;   setDraftCategory: (v: string) => void
  draftStyle: string;      setDraftStyle: (v: string) => void
  draftAudience: string;   setDraftAudience: (v: string) => void
  draftFeatures: string[]; setDraftFeatures: (v: string[]) => void
  draftKeywords: string[]; setDraftKeywords: (v: string[]) => void
  newFeature: string;      setNewFeature: (v: string) => void
  newKeyword: string;      setNewKeyword: (v: string) => void
  startEdit: () => void
  cancelEdit: () => void
  saveEdit: () => void
  onClose?: () => void
}

function Panel(p: PanelProps) {
  return (
    <div className="bg-white" style={{ border: '1px solid #e5e5e5' }}>
      {/* 헤더 */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #e5e5e5' }}>
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-[#9e9ea0]">
            AI 분석
          </div>
          <div className="text-[13px] font-bold text-[#111111] mt-0.5">
            맞나요?
          </div>
        </div>
        {!p.editing ? (
          <button
            onClick={p.startEdit}
            className="text-[11px] font-semibold text-[#707072] hover:text-[#111111] transition-colors"
          >
            ✎ 수정
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button onClick={p.cancelEdit} className="text-[11px] font-semibold text-[#9e9ea0]">취소</button>
            <button
              onClick={p.saveEdit}
              className="px-2.5 py-1 rounded-full text-[10px] font-black text-white bg-[#111111] hover:bg-[#333333] transition-colors"
            >
              저장
            </button>
          </div>
        )}
        {p.onClose && (
          <button onClick={p.onClose} className="ml-2 p-1 text-[#9e9ea0] hover:text-[#111111]">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 본문 */}
      <div className="px-5 py-4 space-y-4">
        <Field label="카테고리">
          {p.editing ? (
            <EditInput value={p.draftCategory} onChange={p.setDraftCategory} placeholder="텀블러" />
          ) : (
            <Value>{p.analysis.category ?? '—'}</Value>
          )}
        </Field>

        <Field label="스타일">
          {p.editing ? (
            <EditInput value={p.draftStyle} onChange={p.setDraftStyle} placeholder="미니멀, 캠퍼스" />
          ) : (
            <Value>{p.analysis.style ?? '—'}</Value>
          )}
        </Field>

        <Field label="타깃">
          {p.editing ? (
            <EditInput value={p.draftAudience} onChange={p.setDraftAudience} placeholder="대학생" />
          ) : (
            <Value>{p.analysis.targetAudience ?? '—'}</Value>
          )}
        </Field>

        <Field label="핵심 특징">
          <ChipList
            items={p.editing ? p.draftFeatures : (p.analysis.keyFeatures ?? [])}
            editable={p.editing}
            onRemove={(i) => p.setDraftFeatures(p.draftFeatures.filter((_, idx) => idx !== i))}
          />
          {p.editing && (
            <AddChip
              value={p.newFeature}
              onChange={p.setNewFeature}
              onAdd={() => {
                if (p.newFeature.trim()) {
                  p.setDraftFeatures([...p.draftFeatures, p.newFeature.trim()])
                  p.setNewFeature('')
                }
              }}
            />
          )}
        </Field>

        <Field label="키워드">
          <ChipList
            items={p.editing ? p.draftKeywords : (p.analysis.keywords ?? [])}
            editable={p.editing}
            prefix="#"
            onRemove={(i) => p.setDraftKeywords(p.draftKeywords.filter((_, idx) => idx !== i))}
          />
          {p.editing && (
            <AddChip
              value={p.newKeyword}
              onChange={p.setNewKeyword}
              prefix="#"
              onAdd={() => {
                if (p.newKeyword.trim()) {
                  p.setDraftKeywords([...p.draftKeywords, p.newKeyword.trim()])
                  p.setNewKeyword('')
                }
              }}
            />
          )}
        </Field>
      </div>
    </div>
  )
}

// ─── 작은 헬퍼들 ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-widest text-[#9e9ea0] mb-1.5">
        {label}
      </div>
      {children}
    </div>
  )
}

function Value({ children }: { children: React.ReactNode }) {
  return <div className="text-[13px] text-[#111111]">{children}</div>
}

function EditInput({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-2 py-1.5 text-[13px] text-[#111111] placeholder:text-[#9e9ea0] focus:outline-none"
      style={{ border: '1px solid #cacacb' }}
      onFocus={(e) => (e.currentTarget.style.borderColor = '#111111')}
      onBlur={(e) => (e.currentTarget.style.borderColor = '#cacacb')}
    />
  )
}

function ChipList({
  items, editable, prefix, onRemove,
}: { items: string[]; editable: boolean; prefix?: string; onRemove?: (i: number) => void }) {
  if (items.length === 0) return <div className="text-[12px] text-[#9e9ea0]">—</div>
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: '#f5f5f5', color: '#111111', border: '1px solid #e5e5e5' }}
        >
          {prefix ?? ''}{item}
          {editable && onRemove && (
            <button onClick={() => onRemove(i)} className="text-[#9e9ea0] hover:text-[#d30005]">
              <X className="w-3 h-3" />
            </button>
          )}
        </span>
      ))}
    </div>
  )
}

function AddChip({
  value, onChange, onAdd, prefix,
}: { value: string; onChange: (v: string) => void; onAdd: () => void; prefix?: string }) {
  return (
    <div className="mt-2 flex items-center gap-1">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onAdd()
          }
        }}
        placeholder={`${prefix ?? ''}추가...`}
        className="flex-1 px-2 py-1 text-[12px] focus:outline-none"
        style={{ border: '1px solid #cacacb' }}
      />
      <button
        onClick={onAdd}
        className="p-1.5 text-[#9e9ea0] hover:text-[#111111] hover:bg-[#f5f5f5]"
        title="추가"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// re-export for symmetry
export { Check }
