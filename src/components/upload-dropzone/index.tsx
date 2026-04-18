'use client'

import { useCallback, useState } from 'react'
import { ImageIcon, Loader2, X, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface UploadDropzoneProps {
  onUploadComplete: (imageUrl: string, base64: string) => void
  onError?: (message: string) => void
  disabled?: boolean
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_MB = 20

export function UploadDropzone({
  onUploadComplete,
  onError,
  disabled,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const processFile = useCallback(
    async (file: File) => {
      // 파일 타입 검사
      if (!ACCEPTED_TYPES.includes(file.type)) {
        onError?.('JPG, PNG, WebP 형식만 지원합니다.')
        return
      }
      // 파일 크기 검사
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        onError?.(`파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다.`)
        return
      }

      setUploading(true)
      setProgress(10)
      setFileName(file.name)

      try {
        // 미리보기 생성
        const previewUrl = URL.createObjectURL(file)
        setPreview(previewUrl)
        setProgress(30)

        // base64 변환
        const base64 = await fileToBase64(file)
        setProgress(60)

        // 서버 업로드 API 호출
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error ?? '업로드 실패')
        }

        const { url } = await response.json()
        setProgress(100)

        onUploadComplete(url, base64)
      } catch (err) {
        const message = err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.'
        onError?.(message)
        setPreview(null)
        setFileName(null)
      } finally {
        setUploading(false)
      }
    },
    [onUploadComplete, onError]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled || uploading) return
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [disabled, uploading, processFile]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleReset = () => {
    setPreview(null)
    setFileName(null)
    setProgress(0)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`rounded-3xl border-2 border-dashed transition-all duration-300 ${
        disabled
          ? 'border-stone-200 bg-stone-100/50 opacity-50 pointer-events-none'
          : isDragging
          ? 'border-stone-900 bg-stone-50 scale-[1.01]'
          : preview
          ? 'border-stone-400 bg-white'
          : 'border-stone-300 bg-white hover:border-stone-500 hover:bg-stone-50'
      }`}
    >
      {preview ? (
        // 업로드된 이미지 미리보기
        <div className="p-6 flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-stone-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="제품 미리보기" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-sm font-sans font-semibold text-stone-900 truncate">
                {fileName}
              </span>
            </div>
            {uploading ? (
              <div className="space-y-1.5">
                <Progress value={progress} className="h-1.5" />
                <p className="text-xs font-sans text-stone-500">업로드 중... {progress}%</p>
              </div>
            ) : (
              <p className="text-xs font-sans text-green-600">업로드 완료</p>
            )}
          </div>
          {!uploading && (
            <button
              onClick={handleReset}
              className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        // 업로드 영역
        <div className="p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-stone-900 flex items-center justify-center mb-4">
            {uploading ? (
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            ) : (
              <ImageIcon className="w-7 h-7 text-white" strokeWidth={1.75} />
            )}
          </div>
          <p className="text-lg mb-1">제품 사진을 업로드하세요</p>
          <p className="text-sm text-stone-500 font-sans mb-6">
            JPG · PNG · WebP (최대 {MAX_SIZE_MB}MB) · 드래그앤드롭 지원
          </p>
          <label htmlFor="file-upload">
            <Button
              disabled={uploading || disabled}
              className="px-6 py-3 rounded-full bg-stone-900 text-white font-sans text-sm font-semibold hover:bg-stone-700 cursor-pointer"
              onClick={(e) => {
                e.preventDefault()
                document.getElementById('file-upload')?.click()
              }}
            >
              파일 선택 →
            </Button>
            <input
              id="file-upload"
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading || disabled}
            />
          </label>
        </div>
      )}
    </div>
  )
}

// ─── 유틸리티 ──────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
