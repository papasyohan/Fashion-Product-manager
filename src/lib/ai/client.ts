/**
 * 이미지 프로바이더 레지스트리 (Nano Banana 2 등)
 *
 * 텍스트 LLM 호출은 `src/lib/ai/router.ts` 의 멀티프로바이더 라우터로 이관됨.
 * 이 파일은 이미지 생성 프로바이더 싱글톤만 관리합니다.
 */

import type { IImageGenProvider } from './image/types'

let _imageProvider: IImageGenProvider | null = null

export function getImageProvider(): IImageGenProvider {
  if (!_imageProvider) throw new Error('Image provider not initialized.')
  return _imageProvider
}

export function setImageProvider(provider: IImageGenProvider): void {
  _imageProvider = provider
}
