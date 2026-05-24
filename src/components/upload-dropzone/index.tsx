'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
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

  // Object URL 추적 — revoke 를 위해 ref 로 관리 (BUG-08 메모리 누수 방지)
  const previewObjectUrlRef = useRef<string | null>(null)
  const revokePreview = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current)
      previewObjectUrlRef.current = null
    }
  }, [])
  // 컴포넌트 unmount 시 해제
  useEffect(() => revokePreview, [revokePreview])

  const processFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        onError?.('JPG, PNG, WebP 형식만 지원합니다.')
        return
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        onError?.(`파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다.`)
        return
      }

      setUploading(true)
      setProgress(10)
      setFileName(file.name)

      try {
        // 이전 preview Object URL 해제 후 새로 생성
        revokePreview()
        const previewUrl = URL.createObjectURL(file)
        previewObjectUrlRef.current = previewUrl
        setPreview(previewUrl)
        setProgress(20)

        const processed = await preprocessImage(file)
        setProgress(45)

        const base64 = await fileToBase64(processed)
        setProgress(65)

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
    [onUploadComplete, onError, revokePreview]
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
    revokePreview()
    setPreview(null)
    setFileName(null)
    setProgress(0)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${
          disabled ? '#e5e5e5' : isDragging ? '#111111' : preview ? '#9e9ea0' : '#cacacb'
        }`,
        backgroundColor: isDragging ? '#f5f5f5' : '#ffffff',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : undefined,
        transition: 'border-color 200ms, background-color 200ms',
      }}
    >
      {preview ? (
        // 업로드된 이미지 미리보기
        <div className="p-6 flex items-center gap-4">
          <div
            className="relative w-20 h-20 overflow-hidden flex-shrink-0"
            style={{ border: '1px solid #e5e5e5' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="제품 미리보기" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#007d48' }} />
              <span className="text-[13px] font-semibold text-[#111111] truncate">
                {fileName}
              </span>
            </div>
            {uploading ? (
              <div className="space-y-1.5">
                <Progress value={progress} className="h-1.5" />
                <p className="text-[12px] text-[#9e9ea0]">업로드 중... {progress}%</p>
              </div>
            ) : (
              <p className="text-[12px] font-medium" style={{ color: '#007d48' }}>업로드 완료</p>
            )}
          </div>
          {!uploading && (
            <button
              onClick={handleReset}
              className="p-1.5 rounded-full hover:bg-[#f5f5f5] text-[#9e9ea0] hover:text-[#111111] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        // 업로드 영역
        <div className="p-10 text-center">
          <div
            className="w-14 h-14 mx-auto flex items-center justify-center mb-4"
            style={{ backgroundColor: '#111111' }}
          >
            {uploading ? (
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            ) : (
              <ImageIcon className="w-7 h-7 text-white" strokeWidth={1.75} />
            )}
          </div>
          <p className="text-[15px] font-semibold text-[#111111] mb-1">제품 사진을 업로드하세요</p>
          <p className="text-[13px] text-[#9e9ea0] mb-6">
            JPG · PNG · WebP (최대 {MAX_SIZE_MB}MB) · 드래그앤드롭 지원
          </p>
          <label htmlFor="file-upload">
            <Button
              disabled={uploading || disabled}
              className="px-6 py-3 rounded-full bg-[#111111] text-white text-[13px] font-semibold hover:bg-[#333333] cursor-pointer"
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
 */
async function preprocessImage(file: File): Promise<File> {
  try {
    const bitmap = await createBitmap(file)
    const { width: srcW, height: srcH } = bitmap

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
    console.warn('[UploadDropzone] 전처리 실패, 원본 파일 업로드:', err)
    return file
  }
}

/** File → ImageBitmap (fallback: HTMLImageElement) */
async function createBitmap(file: File): Promise<ImageBitmap & { close?: () => void }> {
  if (typeof createImageBitmap === 'function') {
    return (await createImageBitmap(file)) as ImageBitmap & { close?: () => void }
  }
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
