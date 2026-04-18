/**
 * T-05: 상세 설명 생성 에이전트 단위 테스트
 * Sprint 0 — TDD Red 단계 (최초 실행 시 반드시 실패)
 */

import { describe, it, expect } from 'vitest'

describe('T-05: generateDescription', () => {
  /**
   * Given: 제품 분석 결과, 상품명, 홍보문구
   * When: generateDescription 함수를 호출
   * Then: 400~800자 사이의 상세 설명을 반환해야 한다
   */
  it('400~800자 사이의 상세 설명을 반환해야 한다', async () => {
    // TODO: backend-dev — /api/generate/description 구현 필요
    const { generateDescription } = await import('@/lib/ai/generators/description-agent')

    const result = await generateDescription({
      productName: '데일리 무드 텀블러',
      tagline: '하루 종일 차갑게, 나만의 시그니처 텀블러',
      category: '텀블러',
      keywords: ['보냉', '스테인리스', '500ml'],
      mode: 'quick',
    })

    expect(result).toBeDefined()
    expect(typeof result.description).toBe('string')
    expect(result.description.length).toBeGreaterThanOrEqual(400)
    expect(result.description.length).toBeLessThanOrEqual(800)
  })

  /**
   * Given: 스튜디오 모드로 상세 설명 생성 요청
   * When: mode: 'studio'로 호출
   * Then: 간편 모드보다 더 상세한 설명(600자 이상)을 반환해야 한다
   */
  it('스튜디오 모드에서 더 상세한 설명을 생성해야 한다', async () => {
    const { generateDescription } = await import('@/lib/ai/generators/description-agent')

    const quickResult = await generateDescription({
      productName: '테스트 상품',
      tagline: '테스트 문구',
      category: '기타',
      keywords: ['테스트'],
      mode: 'quick',
    })

    const studioResult = await generateDescription({
      productName: '테스트 상품',
      tagline: '테스트 문구',
      category: '기타',
      keywords: ['테스트'],
      mode: 'studio',
    })

    expect(studioResult.description.length).toBeGreaterThanOrEqual(
      quickResult.description.length
    )
  })

  /**
   * Given: 상세 설명 생성 함수
   * When: 스펙 정보(소재, 용량, 크기)가 포함된 키워드를 전달
   * Then: 상세 설명에 스펙 섹션(·로 구분)이 포함되어야 한다
   */
  it('제품 스펙 섹션이 설명에 포함되어야 한다', async () => {
    const { generateDescription } = await import('@/lib/ai/generators/description-agent')

    const result = await generateDescription({
      productName: '데일리 무드 텀블러',
      tagline: '하루 종일 차갑게',
      category: '텀블러',
      keywords: ['스테인리스 304', '500ml', '보냉 12h'],
      mode: 'quick',
      specs: {
        material: '스테인리스 304',
        capacity: '500ml',
        features: ['보냉 12h', '보온 8h'],
      },
    })

    // 스펙이 설명에 구조화되어 포함되었는지 검증
    expect(result.description).toMatch(/소재|재질|material/i)
  })
})
