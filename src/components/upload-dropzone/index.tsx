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
/** 전처리 타겟 최대 크기 (긴 변 기준, 개발계획서 G2) */
const MAX_DIMENSION = 2048
/** WebP 품질 — 품질/용량 균형점 (0~1) */
const WEBP_QUALITY = 0.9

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
        // 미리보기 생성 (원본)
        const previewUrl = URL.createObjectURL(file)
        setPreview(previewUrl)
        setProgress(20)

        // 클라이언트 전처리: 긴 변 ≤ 2048px 리사이즈 + WebP 변환 (개발계획서 G2)
        const processed = await preprocessImage(file)
        setProgress(45)

        // base64 변환 (전처리된 파일 기준)
        const base64 = await fileToBase64(processed)
        setProgress(65)

        // 서버 업로드 API 호출 (원본 파일명 유지, 전처리 파일 전송)
        const formData = new FormData()
        formData.append('file', processed, processed.name)

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

/**
 * 업로드 전 클라이언트 측 전처리
 *  - 긴 변이 MAX_DIMENSION(2048px)을 넘으면 비율 유지하며 축소
 *  - PNG/JPEG → WebP 변환 (이미 WebP면 품질만 재인코딩)
 *  - WebP 인코딩 실패/미지원 브라우저는 원본을 그대로 반환 (graceful degrade)
 *
 * 이유:
 *  - 네트워크 절감 (최대 70% 용량 감소)
 *  - Nano Banana 2 reference image는 고해상도 불필요 (≤2K면 충분)
 */
async function preprocessImage(file: File): Promise<File> {
  try {
    const bitmap = await createBitmap(file)
    const { width: srcW, height: srcH } = bitmap

    // 리사이즈 불필요 & 이미 WebP면 그대로 반환
    const needsResize = Math.max(srcW, srcH) > MAX_DIMENSION
    const needsConvert = file.type !== 'image/webp'
    if (!needsResize && !needsConvert) {
      bitmap.close?.()
      return file
    }

    const scale = needsResize ? MAX_DIMENSION / Math.max(srcW, srcH) : 1
    const targetW = Math.round(srcW * scale)
    const targetH = Math.round(srcH * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context 생성 실패')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, targetW, targetH)
    bitmap.close?.()

    const blob = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY)
    if (!blob) throw new Error('WebP 변환 실패')

    const base = file.name.replace(/\.(jpe?g|png|webp)$/i, '')
    return new File([blob], `${base}.webp`, { type: 'image/webp', lastModified: Date.now() })
  } catch (err) {
    // 전처리 실패 시 원본으로 fallback — 업로드 자체는 막지 않는다
    console.warn('[UploadDropzone] 전처리 실패, 원본 파일 업로드:', err)
    return file
  }
}

/** File → ImageBitmap (fallback: HTMLImageElement) */
async function createBitmap(file: File): Promise<ImageBitmap & { close?: () => void }> {
  if (typeof createImageBitmap === 'function') {
    return (await createImageBitmap(file)) as ImageBitmap & { close?: () => void }
  }
  // 레거시 fallback — HTMLImageElement를 ImageBitmap 호환 객체로 감싼다
  const img = new Image()
  const url = URL.createObjectURL(file)
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('이미지 디코딩 실패'))
    img.src = url
  })
  URL.revokeObjectURL(url)
  return Object.assign(img as unknown as ImageBitmap, {
    close: () => { /* noop */ },
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}
