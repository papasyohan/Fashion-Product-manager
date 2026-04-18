/**
 * T-03: 상품명 생성 에이전트 단위 테스트
 * Sprint 0 — TDD Red 단계 (최초 실행 시 반드시 실패)
 */

import { describe, it, expect } from 'vitest'

describe('T-03: generateProductNames', () => {
  /**
   * Given: 분석된 제품 정보와 트렌드 키워드
   * When: generateProductNames 함수를 호출
   * Then: 3개의 상품명을 반환해야 한다
   */
  it('상품명 3개를 반환해야 한다', async () => {
    // TODO: backend-dev — /api/generate/naming 구현 필요
    const { generateProductNames } = await import('@/lib/ai/generators/naming-agent')

    const result = await generateProductNames({
      category: '텀블러',
      keywords: ['감성', '보냉', '미니멀'],
      trendKeywords: ['데일리템', '오피스룩'],
    })

    expect(result).toBeDefined()
    expect(result.names).toHaveLength(3)
    result.names.forEach((name: string) => {
      expect(typeof name).toBe('string')
      expect(name.length).toBeGreaterThan(0)
      expect(name.length).toBeLessThanOrEqual(40) // 쿠팡 기준 최대 40자
    })
  })

  /**
   * Given: 분석된 제품 정보
   * When: generateProductNames 함수를 호출
   * Then: 각 상품명에 트렌드 해시태그가 포함되어야 한다
   */
  it('각 상품명에 연관 트렌드 키워드가 포함되어야 한다', async () => {
    const { generateProductNames } = await import('@/lib/ai/generators/naming-agent')

    const result = await generateProductNames({
      category: '텀블러',
      keywords: ['보냉'],
      trendKeywords: ['아이스보틀'],
    })

    expect(result.trendTags).toBeInstanceOf(Array)
    expect(result.trendTags.length).toBeGreaterThan(0)
  })

  /**
   * Given: generateProductNames 함수
   * When: 금칙어가 포함된 키워드를 전달
   * Then: 금칙어 없이 정제된 상품명을 반환해야 한다
   */
  it('금칙어(의료효능 과장 등)를 필터링해야 한다', async () => {
    const { generateProductNames } = await import('@/lib/ai/generators/naming-agent')

    const result = await generateProductNames({
      category: '건강식품',
      keywords: ['건강'],
      trendKeywords: [],
      forbiddenTerms: ['치료', '완치'],
    })

    result.names.forEach((name: string) => {
      expect(name).not.toMatch(/치료|완치|의학적으로/)
    })
  })
})
