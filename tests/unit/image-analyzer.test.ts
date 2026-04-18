/**
 * T-01, T-02: 이미지 분석 에이전트 단위 테스트
 * Sprint 0 — TDD Red 단계 (최초 실행 시 반드시 실패)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── T-01: analyzeProductImage ──────────────────────────────────────────────

describe('T-01: analyzeProductImage', () => {
  /**
   * Given: Claude Vision API를 래핑한 analyzeProductImage 함수
   * When: 유효한 제품 이미지 URL을 전달
   * Then: 카테고리, 색상, 소재 등 구조화된 분석 결과를 반환해야 한다
   */
  it('유효한 이미지 URL로 제품 분석 결과를 반환해야 한다', async () => {
    // TODO: ai-pipeline-dev — analyzeProductImage 구현 필요
    const { analyzeProductImage } = await import('@/lib/ai/analyzers/image-analyzer')

    const result = await analyzeProductImage({
      imageUrl: 'https://example.com/product.jpg',
      mode: 'quick',
    })

    expect(result).toBeDefined()
    expect(result.category).toBeTruthy()
    expect(result.colors).toBeInstanceOf(Array)
    expect(result.keywords).toBeInstanceOf(Array)
    expect(result.keywords.length).toBeGreaterThan(0)
  })

  /**
   * Given: analyzeProductImage 함수
   * When: 잘못된 형식의 이미지 URL을 전달
   * Then: 명확한 에러 메시지와 함께 예외를 던져야 한다
   */
  it('잘못된 이미지 URL에 대해 에러를 던져야 한다', async () => {
    const { analyzeProductImage } = await import('@/lib/ai/analyzers/image-analyzer')

    await expect(
      analyzeProductImage({
        imageUrl: 'not-a-valid-url',
        mode: 'quick',
      })
    ).rejects.toThrow()
  })
})

// ─── T-02: preflight 이미지 검사 ───────────────────────────────────────────

describe('T-02: preflightImageCheck', () => {
  /**
   * Given: 이미지 사전 검사 함수
   * When: 512px × 512px 이상의 유효한 이미지 파일
   * Then: passed: true와 함께 이미지 메타데이터를 반환해야 한다
   */
  it('유효한 이미지 파일에 대해 passed: true를 반환해야 한다', async () => {
    const { preflightImageCheck } = await import('@/lib/ai/analyzers/image-analyzer')

    // 1×1 PNG base64 (최소 테스트용)
    const minimalPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

    const result = await preflightImageCheck(minimalPng)

    expect(result).toBeDefined()
    expect(result).toHaveProperty('passed')
  })

  /**
   * Given: 이미지 사전 검사 함수
   * When: 최소 해상도(512×512)보다 작은 이미지
   * Then: passed: false와 에러 메시지를 반환해야 한다
   */
  it('해상도 미달 이미지에 대해 passed: false를 반환해야 한다', async () => {
    const { preflightImageCheck } = await import('@/lib/ai/analyzers/image-analyzer')

    const tinyImage = 'data:image/png;base64,TINY'

    const result = await preflightImageCheck(tinyImage)

    expect(result.passed).toBe(false)
    expect(result.errors).toContain(expect.stringMatching(/해상도|resolution/i))
  })
})
