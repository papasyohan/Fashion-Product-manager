/**
 * T-04: 한줄 홍보문구 생성 에이전트 단위 테스트
 * Sprint 0 — TDD Red 단계 (최초 실행 시 반드시 실패)
 */

import { describe, it, expect } from 'vitest'

describe('T-04: generateTagline', () => {
  /**
   * Given: 선택된 상품명과 제품 분석 정보
   * When: generateTagline 함수를 호출
   * Then: 35자 이내의 한줄 홍보문구를 반환해야 한다
   */
  it('35자 이내의 홍보문구를 반환해야 한다', async () => {
    // TODO: backend-dev — /api/generate/tagline 구현 필요
    const { generateTagline } = await import('@/lib/ai/generators/tagline-agent')

    const result = await generateTagline({
      productName: '데일리 무드 텀블러',
      category: '텀블러',
      keywords: ['보냉', '미니멀', '감성'],
    })

    expect(result).toBeDefined()
    expect(typeof result.tagline).toBe('string')
    expect(result.tagline.length).toBeGreaterThan(0)
    expect(result.tagline.length).toBeLessThanOrEqual(35)
  })

  /**
   * Given: 홍보문구 생성 함수
   * When: 제품명과 핵심 키워드를 전달
   * Then: 감성적이고 전환율을 높이는 문구를 반환해야 한다 (SEO 키워드 포함 여부 검증)
   */
  it('SEO 핵심 키워드가 홍보문구에 반영되어야 한다', async () => {
    const { generateTagline } = await import('@/lib/ai/generators/tagline-agent')

    const result = await generateTagline({
      productName: '쿨핏 아이스 보틀',
      category: '텀블러',
      keywords: ['아이스', '보냉'],
    })

    expect(result.seoScore).toBeDefined()
    expect(result.seoScore).toBeGreaterThan(0)
  })

  /**
   * Given: 홍보문구 생성 함수
   * When: 빈 키워드 배열로 호출
   * Then: 에러를 던지지 않고 기본 문구를 반환해야 한다
   */
  it('키워드가 없어도 기본 문구를 생성해야 한다', async () => {
    const { generateTagline } = await import('@/lib/ai/generators/tagline-agent')

    const result = await generateTagline({
      productName: '테스트 상품',
      category: '기타',
      keywords: [],
    })

    expect(result.tagline).toBeTruthy()
  })
})
