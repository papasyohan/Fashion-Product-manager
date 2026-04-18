/**
 * T-07: 트렌드 키워드 API 래퍼 단위 테스트
 * Sprint 0 — TDD Red 단계 (최초 실행 시 반드시 실패)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('T-07: TrendFetcher', () => {
  /**
   * Given: 제품 카테고리
   * When: fetchTrendKeywords 호출
   * Then: 최신 트렌드 키워드 배열을 반환해야 한다
   */
  it('카테고리에 맞는 트렌드 키워드를 반환해야 한다', async () => {
    // TODO: backend-dev — lib/trends/trend-fetcher.ts 구현 필요
    const { fetchTrendKeywords } = await import('@/lib/trends/trend-fetcher')

    const result = await fetchTrendKeywords({ category: '텀블러' })

    expect(result).toBeDefined()
    expect(result.keywords).toBeInstanceOf(Array)
    expect(result.keywords.length).toBeGreaterThan(0)
    expect(typeof result.keywords[0]).toBe('string')
    expect(result.fetchedAt).toBeTruthy()
  })

  /**
   * Given: 트렌드 결과를 캐싱하는 fetchTrendKeywords
   * When: 동일한 카테고리로 2회 연속 호출
   * Then: 두 번째 호출은 캐시에서 반환되어야 한다 (API 2회 호출 방지)
   */
  it('동일 카테고리 재요청 시 캐시된 결과를 반환해야 한다', async () => {
    const { fetchTrendKeywords } = await import('@/lib/trends/trend-fetcher')

    const first = await fetchTrendKeywords({ category: '텀블러' })
    const second = await fetchTrendKeywords({ category: '텀블러' })

    expect(second.fromCache).toBe(true)
    expect(second.keywords).toEqual(first.keywords)
  })

  /**
   * Given: 트렌드 API
   * When: 알 수 없는 카테고리를 전달
   * Then: 에러 없이 빈 배열 또는 기본 키워드를 반환해야 한다
   */
  it('알 수 없는 카테고리에 대해 빈 배열을 반환해야 한다', async () => {
    const { fetchTrendKeywords } = await import('@/lib/trends/trend-fetcher')

    const result = await fetchTrendKeywords({ category: '존재하지않는카테고리xyz' })

    expect(result.keywords).toBeInstanceOf(Array)
    // 에러를 던지지 않고 빈 배열로 graceful degradation
  })

  /**
   * Given: fetchTrendKeywords
   * When: 외부 API가 실패(429 또는 500)했을 때
   * Then: 지수 백오프 재시도 후 fallback 키워드를 반환해야 한다
   */
  it('API 실패 시 fallback 키워드를 반환해야 한다', async () => {
    const { fetchTrendKeywords } = await import('@/lib/trends/trend-fetcher')

    // 네트워크 실패 시뮬레이션
    const result = await fetchTrendKeywords({
      category: '텀블러',
      _forceError: true, // 테스트용 플래그
    })

    expect(result.keywords).toBeInstanceOf(Array)
    expect(result.fromFallback).toBe(true)
  })
})
