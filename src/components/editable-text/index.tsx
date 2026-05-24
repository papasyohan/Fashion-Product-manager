'use client'

/**
 * EditableText — v1.1 UX Customization L3 (Inline Result Edit)
 *
 * 클릭하면 input/textarea 로 전환되어 직접 편집.
 * ESC → 취소, Enter (singleline) 또는 blur → 저장.
 *
 * Props:
 * - value: 현재 텍스트
 * - onSave: 새 값으로 저장 (DB 갱신은 부모 책임)
 * - multiline: true 면 textarea
 * - maxLength: 글자수 제한 (초과 시 빨강 카운터 + Enter 차단)
 * - placeholder: 빈 값일 때
 * - className: 표시 모드 스타일 (편집 모드는 강제 스타일)
 */

import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'

interface EditableTextProps {
  value: string
  onSave: (newValue: string) => void
  multiline?: boolean
  maxLength?: number
  placeholder?: string
  className?: string
  showEditIcon?: boolean
  /** 사용자가 이미 편집한 적이 있으면 "직접 수정함" 마이크로 라벨 표시 */
  userEdited?: boolean
}

export function EditableText({
  value,
  onSave,
  multiline = false,
  maxLength,
  placeholder = '클릭하여 편집',
  className = '',
  showEditIcon = true,
  userEdited = false,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      // 텍스트 전체 선택 (input/textarea 모두 지원)
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select()
      } else {
        const len = inputRef.current.value.length
        inputRef.current.setSelectionRange(0, len)
      }
    }
  }, [editing])

  const overLimit = !!maxLength && draft.length > maxLength

  const commit = () => {
    if (overLimit) return // 한도 초과면 저장 안 함
    if (draft.trim() !== value.trim()) {
      onSave(draft.trim())
    }
    setEditing(false)
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    } else if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      commit()
    } else if (e.key === 'Enter' && multiline && (e.ctrlKey || e.metaKey)) {
      // multiline: Cmd/Ctrl+Enter 로 저장
      e.preventDefault()
      commit()
    }
  }

  // ─── 편집 모드 ────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="relative">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            onBlur={commit}
            rows={6}
            className="w-full p-3 text-[13px] text-[#111111] leading-relaxed resize-none focus:outline-none"
            style={{
              border: `2px solid ${overLimit ? '#d30005' : '#111111'}`,
              backgroundColor: '#ffffff',
            }}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            onBlur={commit}
            className="w-full p-2 text-[15px] font-bold text-[#111111] focus:outline-none"
            style={{
              border: `2px solid ${overLimit ? '#d30005' : '#111111'}`,
              backgroundColor: '#ffffff',
            }}
          />
        )}
        {maxLength && (
          <div className="mt-1 flex items-center justify-between text-[10px]">
            <span className="text-[#9e9ea0]">
              {multiline ? 'Cmd+Enter 저장 · ESC 취소' : 'Enter 저장 · ESC 취소'}
            </span>
            <span style={{ color: overLimit ? '#d30005' : '#9e9ea0' }}>
              {draft.length}{maxLength ? `/${maxLength}` : ''}
            </span>
          </div>
        )}
      </div>
    )
  }

  // ─── 표시 모드 ────────────────────────────────────────────────────────────
  const isEmpty = !value || !value.trim()
  return (
    <div className="group relative">
      <div
        onClick={() => setEditing(true)}
        className={`${className} cursor-text transition-colors hover:bg-[#f5f5f5] -mx-1 px-1 -my-0.5 py-0.5`}
        style={{ borderRadius: 0 }}
        role="textbox"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setEditing(true)
          }
        }}
      >
        {isEmpty ? (
          <span className="text-[#9e9ea0] italic">{placeholder}</span>
        ) : (
          value
        )}
      </div>

      {userEdited && (
        <div className="mt-0.5 text-[10px] font-semibold text-[#9e9ea0] flex items-center gap-1">
          <Pencil className="w-2.5 h-2.5" />
          직접 수정함
        </div>
      )}

      {showEditIcon && (
        <button
          onClick={() => setEditing(true)}
          className="absolute top-0 right-0 -mr-6 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[#9e9ea0] hover:text-[#111111]"
          title="편집"
          tabIndex={-1}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
