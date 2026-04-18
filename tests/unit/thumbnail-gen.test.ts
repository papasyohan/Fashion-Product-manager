/**
 * T-06, T-06b, T-06c: 썸네일 생성 (Nano Banana 2) 단위 테스트
 * Sprint 0 — TDD Red 단계 (최초 실행 시 반드시 실패)
 */

import { describe, it, expect, vi } from 'vitest'
import type { ImageGenParams } from '@/lib/ai/image/types'

// ─── T-06: 기본 이미지 생성 ────────────────────────────────────────────────

describe('T-06: NanaBanana2Provider.generate', () => {
  /**
   * Given: 유효한 참조 이미지와 프롬프트
   * When: NanaBanana2Provider.generate 호출
   * Then: ImageGenResult 형식으로 이미지 배열을 반환해야 한다
   */
  it('유효한 파라미터로 이미지 생성 결과를 반환해야 한다', async () => {
    // TODO: ai-pipeline-dev — NanaBanana2Provider 구현 필요
    const { NanaBanana2Provider } = await import('@/lib/ai/image/nano-banana2-provider')

    const params: ImageGenParams = {
      referenceImages: ['https://example.com/product.jpg'],
      prompt: 'Keep the exact product appearance intact. White studio background.',
      aspectRatios: ['1:1'],
      count: 1,
      resolution: '2K',
    }

    const provider = new NanaBanana2Provider()
    const result = await provider.generate(params)

    expect(result).toBeDefined()
    expect(result.images).toBeInstanceOf(Array)
    expect(result.images.length).toBe(1)
    expect(result.images[0]).toHaveProperty('url')
    expect(result.images[0]).toHaveProperty('width')
    expect(result.images[0]).toHaveProperty('height')
    expect(result.requestId).toBeTruthy()
  })

  /**
   * Given: NanaBanana2Provider
   * When: IImageGenProvider 인터페이스 구현 여부 확인
   * Then: generate 메서드가 존재해야 한다 (교체 가능성 보장)
   */
  it('IImageGenProvider 인터페이스를 구현해야 한다', async () => {
    const { NanaBanana2Provider } = await import('@/lib/ai/image/nano-banana2-provider')

    const provider = new NanaBanana2Provider()
    expect(typeof provider.generate).toBe('function')
  })
})

// ─── T-06b: 다중 종횡비 생성 ──────────────────────────────────────────────

describe('T-06b: 다중 종횡비 동시 생성', () => {
  /**
   * Given: 4가지 종횡비 요청 (1:1, 4:5, 9:16, 16:9)
   * When: NanaBanana2Provider.generate 호출
   * Then: 각 종횡비에 맞는 이미지 4장을 반환해야 한다
   */
  it('요청한 모든 종횡비의 이미지를 반환해야 한다', async () => {
    const { NanaBanana2Provider } = await import('@/lib/ai/image/nano-banana2-provider')

    const params: ImageGenParams = {
      referenceImages: ['https://example.com/product.jpg'],
      prompt: 'Product studio shot.',
      aspectRatios: ['1:1', '4:5', '9:16', '16:9'],
      count: 1,
      resolution: '2K',
    }

    const provider = new NanaBanana2Provider()
    const result = await provider.generate(params)

    expect(result.images.length).toBe(4)

    const returnedRatios = result.images.map((img) => img.aspectRatio)
    expect(returnedRatios).toContain('1:1')
    expect(returnedRatios).toContain('4:5')
    expect(returnedRatios).toContain('9:16')
    expect(returnedRatios).toContain('16:9')
  })
})

// ─── T-06c: Subject Consistency 검증 ─────────────────────────────────────

describe('T-06c: Subject Consistency 검증', () => {
  /**
   * Given: 참조 이미지와 Subject Anchor 프롬프트
   * When: 5계층 프롬프트 빌더로 프롬프트 조립
   * Then: Subject Anchor가 프롬프트 첫 번째 계층에 포함되어야 한다
   */
  it('Subject Anchor 구문이 프롬프트에 포함되어야 한다', async () => {
    const { buildImagePrompt } = await import('@/lib/ai/image/prompt-builder')

    const layers = {
      subjectAnchor: 'Keep the exact product appearance, shape, color, logo 100% intact.',
      scene: 'White clean studio background',
      moodStyle: 'Korean e-commerce style, bright, clean',
      composition: 'Center composition, product filling 70% of frame',
    }

    const prompt = buildImagePrompt(layers)

    expect(typeof prompt).toBe('string')
    expect(prompt).toContain('intact')
    expect(prompt.indexOf(layers.subjectAnchor)).toBeLessThan(
      prompt.indexOf(layers.scene)
    )
  })

  /**
   * Given: 5계층 프롬프트 빌더
   * When: overlayText를 포함하여 호출
   * Then: 한글 텍스트 오버레이 지시가 프롬프트에 포함되어야 한다
   */
  it('overlayText가 있을 때 텍스트 오버레이 계층이 추가되어야 한다', async () => {
    const { buildImagePrompt } = await import('@/lib/ai/image/prompt-builder')

    const layers = {
      subjectAnchor: 'Keep product intact.',
      scene: 'Studio background',
      moodStyle: 'Minimal',
      composition: 'Center',
      textOverlay: '신상 20% 할인',
    }

    const prompt = buildImagePrompt(layers)
    expect(prompt).toContain('신상 20% 할인')
  })
})
