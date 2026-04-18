/**
 * E-01: 간편 모드 전체 파이프라인 E2E 테스트
 * Sprint 0 — TDD Red 단계 (최초 실행 시 반드시 실패)
 *
 * 통합 기준 I-01: 간편 모드 파이프라인 응답 ≤ 30초
 */

import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('E-01: 간편 모드 전체 플로우', () => {
  /**
   * Given: 사용자가 스튜디오 페이지에 접근
   * When: 간편 모드 선택 → 이미지 업로드 → 생성 대기
   * Then: 30초 이내에 상품명 3종, 홍보문구, 상세설명이 표시되어야 한다
   */
  test('간편 모드: 이미지 업로드 → 결과 생성 ≤ 30초', async ({ page }) => {
    // TODO: Sprint 1에서 실제 구현 후 Green 전환
    await page.goto('http://localhost:3000/studio')

    // 간편 모드 카드 확인
    await expect(page.getByText('간편 모드')).toBeVisible()
    await expect(page.getByText('Quick Mode')).toBeVisible()

    // 간편 모드 선택
    await page.getByText('간편 모드').click()

    // 모드 선택 확인 (체크마크 표시)
    await expect(page.locator('[data-testid="mode-selected-quick"]')).toBeVisible()

    // 파일 업로드 (테스트 픽스처 이미지)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(
      path.join(__dirname, '../fixtures/test-product.jpg')
    )

    // 생성 시작
    const startTime = Date.now()
    await page.getByText('파일 선택').click()

    // 로딩 상태 확인
    await expect(page.getByText(/분석 중|생성 중/)).toBeVisible({ timeout: 5000 })

    // 결과 페이지로 이동 (최대 30초)
    await expect(page.getByText('생성 완료')).toBeVisible({ timeout: 30000 })
    const elapsed = Date.now() - startTime
    expect(elapsed).toBeLessThan(30000) // I-01 기준

    // 결과 내용 검증
    await expect(page.getByText('상품명 3종')).toBeVisible()
    await expect(page.getByText('한줄 홍보문구')).toBeVisible()
    await expect(page.getByText('상세 설명')).toBeVisible()

    // 썸네일 섹션 없음 (간편 모드)
    await expect(page.getByText('다중 비율 동시 생성')).not.toBeVisible()
  })

  /**
   * Given: 간편 모드 결과 페이지
   * When: 결과가 표시된 후
   * Then: 상품명 3개가 각각 클릭 가능해야 한다
   */
  test('간편 모드 결과: 상품명 3개가 선택 가능해야 한다', async ({ page }) => {
    // TODO: Sprint 1 구현 후 활성화
    await page.goto('http://localhost:3000/studio')

    // 간편 모드 선택 및 결과까지 이동 (공통 setup)
    await page.getByText('간편 모드').click()
    await page.locator('input[type="file"]').setInputFiles(
      path.join(__dirname, '../fixtures/test-product.jpg')
    )
    await page.getByText('파일 선택').click()
    await expect(page.getByText('생성 완료')).toBeVisible({ timeout: 30000 })

    // 상품명 카드 3개 확인
    const nameCards = page.locator('[data-testid="product-name-card"]')
    await expect(nameCards).toHaveCount(3)

    // 첫 번째 상품명 선택
    await nameCards.first().click()
    await expect(nameCards.first()).toHaveClass(/selected|border-stone-900/)
  })
})
