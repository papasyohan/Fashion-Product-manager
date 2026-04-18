/**
 * E-02: 스튜디오 모드 전체 파이프라인 E2E 테스트
 * Sprint 0 — TDD Red 단계 (최초 실행 시 반드시 실패)
 *
 * 통합 기준 I-02: 스튜디오 모드 파이프라인 응답 ≤ 3분
 */

import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('E-02: 스튜디오 모드 전체 플로우', () => {
  /**
   * Given: 사용자가 스튜디오 페이지에 접근
   * When: 스튜디오 모드 선택 → 이미지 업로드 → 생성 대기
   * Then: 3분 이내에 텍스트 + 4종 썸네일이 표시되어야 한다
   */
  test('스튜디오 모드: 이미지 업로드 → 4종 썸네일 생성 ≤ 3분', async ({ page }) => {
    test.setTimeout(200000) // 3분 + 여유 20초

    // TODO: Sprint 2 구현 후 Green 전환
    await page.goto('http://localhost:3000/studio')

    // 스튜디오 모드 선택
    await page.getByText('스튜디오 모드').click()

    // Nano Banana 2 배지 확인
    await expect(page.getByText('Nano Banana 2')).toBeVisible()

    // 파일 업로드
    await page.locator('input[type="file"]').setInputFiles(
      path.join(__dirname, '../fixtures/test-product.jpg')
    )

    const startTime = Date.now()
    await page.getByText('파일 선택').click()

    // 단계별 로딩 상태 확인
    await expect(page.getByText(/이미지 분석 중/)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/상품명 생성 중/)).toBeVisible({ timeout: 60000 })
    await expect(page.getByText(/썸네일 생성 중/)).toBeVisible({ timeout: 90000 })

    // 결과 완료 (최대 3분)
    await expect(page.getByText('생성 완료')).toBeVisible({ timeout: 180000 })
    const elapsed = Date.now() - startTime
    expect(elapsed).toBeLessThan(180000) // I-02 기준

    // 썸네일 4종 확인
    await expect(page.getByText('다중 비율 동시 생성')).toBeVisible()
    const thumbnails = page.locator('[data-testid="thumbnail-card"]')
    await expect(thumbnails).toHaveCount(4)

    // 각 종횡비 라벨 확인
    await expect(page.getByText('1:1')).toBeVisible()
    await expect(page.getByText('4:5')).toBeVisible()
    await expect(page.getByText('9:16')).toBeVisible()
    await expect(page.getByText('16:9')).toBeVisible()
  })

  /**
   * Given: 스튜디오 모드 결과 페이지
   * When: 썸네일이 생성된 후
   * Then: 대표 이미지 선택, Kakao 공유, SMS 공유 버튼이 표시되어야 한다
   */
  test('스튜디오 모드 결과: 공유 버튼이 표시되어야 한다', async ({ page }) => {
    test.setTimeout(200000)

    // TODO: Sprint 2 구현 후 활성화
    await page.goto('http://localhost:3000/studio')
    await page.getByText('스튜디오 모드').click()
    await page.locator('input[type="file"]').setInputFiles(
      path.join(__dirname, '../fixtures/test-product.jpg')
    )
    await page.getByText('파일 선택').click()
    await expect(page.getByText('생성 완료')).toBeVisible({ timeout: 180000 })

    // 공유 섹션 확인
    await expect(page.getByText('공유하기')).toBeVisible()
    await expect(page.getByText('카카오톡')).toBeVisible()
    await expect(page.getByText('SMS')).toBeVisible()
    await expect(page.getByText('링크 복사')).toBeVisible()
  })

  /**
   * Given: 스튜디오 모드 결과
   * When: SynthID 고지 고지문 확인
   * Then: AI 생성 콘텐츠 고지 문구가 화면에 표시되어야 한다 (보안 규칙)
   */
  test('스튜디오 모드: SynthID 고지문이 표시되어야 한다', async ({ page }) => {
    test.setTimeout(200000)

    await page.goto('http://localhost:3000/studio')
    await page.getByText('스튜디오 모드').click()
    await page.locator('input[type="file"]').setInputFiles(
      path.join(__dirname, '../fixtures/test-product.jpg')
    )
    await page.getByText('파일 선택').click()
    await expect(page.getByText('생성 완료')).toBeVisible({ timeout: 180000 })

    // SynthID 고지 확인
    await expect(page.getByText(/SynthID|AI 생성 콘텐츠/)).toBeVisible()
  })

  /**
   * Given: 스튜디오 모드
   * When: Kakao OG 메타데이터 검증 (I-03)
   * Then: og:title, og:description, og:image가 올바르게 설정되어야 한다
   */
  test('I-03: Kakao OG 메타데이터가 올바르게 설정되어야 한다', async ({ page }) => {
    // TODO: 공유 페이지 생성 후 활성화
    await page.goto('http://localhost:3000/studio')

    const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content')
    const ogDesc = await page.getAttribute('meta[property="og:description"]', 'content')

    expect(ogTitle).toBeTruthy()
    expect(ogDesc).toBeTruthy()
  })
})
