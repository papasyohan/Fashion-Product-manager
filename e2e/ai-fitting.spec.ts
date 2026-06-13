/**
 * AI Fitting — E2E 스캐폴드 (Phase 4 "D안")
 *
 * 워크스트림 ② 동반 스텁. **Playwright 설치 불필요** — 이 파일은 자동화 가능 구간의
 * 골격(scaffold)이며, 실제 라이브 업로드·생성은 헤드리스 환경에서 자동화 불가.
 *
 * 상세 정적 검증 + 수동 체크리스트: docs/E2E_AI_FITTING.md
 *
 * ── 자동화 가능 / 불가 구분 ────────────────────────────────────────────────
 *  [가능]  /studio 내비게이션, 스튜디오 모드 진입, 비율 체크박스 토글에 따른
 *          생성 버튼 라벨 변화(AI Fitting · N장 · K크레딧), Pro+ 게이팅 모달 UI.
 *  [불가]  실제 모델 사진 파일 업로드 + 라이브 Gemini 생성:
 *            · 헤드리스 파일피커 한계 (input[type=file].setInputFiles 로 우회 가능하나
 *              실 픽스처 이미지가 레포에 없음 — tests/fixtures/test-model.jpg 미존재)
 *            · 인증된 Pro 세션 필요 (AI Fitting 은 Pro 이상 게이트)
 *            · 유효한 GOOGLE_* API 키 + 30~90초 생성 시간
 *          → 해당 테스트는 test.skip / TODO 로 표시.
 *
 * ── 러너 연결 주의 ─────────────────────────────────────────────────────────
 *  레포에 playwright.config.ts 가 없고, 기존 스펙은 tests/e2e/ 에 위치한다
 *  (package.json: "test:e2e": "playwright test"). 이 신규 e2e/ 디렉터리는 현재
 *  러너 글롭에 잡히지 않을 수 있다. 본 파일은 스캐폴드 전용이며, 러너 설정 연결
 *  (playwright.config.ts 생성 또는 testDir 확장)은 본 워크스트림 범위 외다
 *  (package.json / config 미수정 원칙).
 *
 * import 스타일은 기존 tests/e2e/studio-mode.spec.ts 와 동일하게 맞춘다.
 */

import { test, expect } from '@playwright/test'
import path from 'path'

// 기존 스펙과 동일 베이스 URL 컨벤션 (tests/e2e/*.spec.ts).
const BASE = 'http://localhost:3000'

/**
 * 결과 화면(AI Fitting 패널이 노출되는 상태)까지 도달하기 위한 공통 셋업.
 *
 * AI Fitting 패널은 studio/page.tsx 의 status==='done' 분기에서만 렌더되므로,
 * 먼저 스튜디오 모드로 1회 생성을 완료해야 한다. 이 단계는 실 픽스처 + 라이브
 * 파이프라인이 필요하므로 자동화 테스트에서는 직접 호출하지 않고 골격만 둔다.
 *
 * @returns 자동화 시 활성화할 setup 의 의사코드. 실제 구현은 인증/픽스처 확보 후.
 */
async function gotoStudioResult(/* page: import('@playwright/test').Page */): Promise<void> {
  // TODO(setup): 아래는 결과 화면 진입 의사코드 — 인증 세션 + 픽스처 확보 후 활성화.
  //   await page.goto(`${BASE}/studio`)
  //   await page.getByText('스튜디오 모드').click()
  //   // (의도 입력 단계가 뜨면 건너뛰기)
  //   await page.locator('input[type="file"]').setInputFiles(
  //     path.join(__dirname, '../tests/fixtures/test-product.jpg')
  //   )
  //   await expect(page.getByText('생성 완료')).toBeVisible({ timeout: 180000 })
  void BASE
  void path
}

test.describe('AI Fitting — 자동화 가능 구간', () => {
  /**
   * Given: 비로그인 또는 임의 사용자가 /studio 접근
   * When: 페이지 로드
   * Then: 스튜디오 진입점(모드 선택)이 보인다
   *
   * 가장 가벼운 스모크 — 인증/픽스처 없이도 페이지가 뜨는지만 확인.
   */
  test('스모크: /studio 가 로드되고 모드 선택이 보인다', async ({ page }) => {
    await page.goto(`${BASE}/studio`)
    // 로그인 가드가 있으면 /login 으로 리다이렉트될 수 있다 — 둘 중 하나는 보여야 함.
    await expect(
      page.getByText('스튜디오 모드').or(page.getByText(/로그인|이메일|계속/))
    ).toBeVisible({ timeout: 15000 })
  })

  /**
   * Given: 결과 화면(AI Fitting 패널 노출)
   * When: 비율 체크박스를 1/2/3장으로 토글
   * Then: 생성 버튼 라벨이 'AI Fitting · N장 · K크레딧' 으로 갱신된다 (K = 2/4/5)
   *
   * 라벨 소스(재설계 금지 — Phase 4 D안):
   *   생성 버튼   ai-fitting-panel/index.tsx:330  →  'AI Fitting · {N}장 · {K}크레딧'  (크레딧 앞 공백 X)
   *   비율 헤더   ai-fitting-panel/index.tsx:172   →  '{N}장 · {K} 크레딧'              (크레딧 앞 공백 O)
   *
   * 셀렉터 취약성(R-5): '5크레딧' 단순 텍스트 매칭은 안내 박스 정적 문구와 충돌할 수 있어
   *   반드시 생성 버튼(role=button)으로 스코프를 한정한다.
   */
  test.skip('비율 토글 → 생성 버튼 크레딧 라벨 (2/4/5)', async ({ page }) => {
    // SKIP 사유: 결과 화면 진입에 인증 Pro 세션 + 실 픽스처 + 라이브 파이프라인 필요.
    await gotoStudioResult(/* page */)

    // 생성 버튼 — 라벨 접두 'AI Fitting' 으로 스코프 한정 (안내 박스 문구 오매칭 방지).
    const generateBtn = page.getByRole('button', { name: /AI Fitting · \d장 · \d크레딧/ })

    // 기본 상태: 3장 모두 체크 → 5크레딧
    await expect(generateBtn).toHaveText(/AI Fitting · 3장 · 5크레딧/)

    // 9:16 체크 해제 → 2장 → 4크레딧
    await page.getByRole('button', { name: /9:16/ }).click()
    await expect(generateBtn).toHaveText(/AI Fitting · 2장 · 4크레딧/)

    // 4:5 도 해제 → 1장 → 2크레딧
    await page.getByRole('button', { name: /4:5/ }).click()
    await expect(generateBtn).toHaveText(/AI Fitting · 1장 · 2크레딧/)

    // 모두 해제 → 생성 불가 라벨
    await page.getByRole('button', { name: /1:1/ }).click()
    await expect(page.getByRole('button', { name: /비율 선택 필요/ })).toBeVisible()
  })

  /**
   * Given: 결과 화면 + 모델 업로드 완료 상태 (Pro 미만 플랜)
   * When: AI Fitting 생성 클릭 → 서버 402 (Pro 게이트)
   * Then: CreditGuardModal '플랜 업그레이드 필요' 가 노출된다
   *
   * 서버 근거: credit-guard.ts OPERATION_PLAN_GATE.studio_fitting=['pro','business'] →
   *   402 reason='AI Fitting 기능은 Pro 이상 플랜에서만 사용 가능합니다.'(="Pro" 포함)
   *   → studio/page.tsx:498 reason='plan_required' → 모달 제목 '플랜 업그레이드 필요'.
   */
  test.skip('Pro+ 게이팅: 플랜 미달 시 플랜 업그레이드 모달', async ({ page }) => {
    // SKIP 사유: free/starter 인증 세션 + 결과 화면 진입(모델 업로드)까지 필요.
    await gotoStudioResult(/* page */)
    // TODO: 모델 픽스처 업로드 후 생성 클릭
    //   await page.locator('input[type="file"]').setInputFiles(
    //     path.join(__dirname, '../tests/fixtures/test-model.jpg')   // ← 픽스처 미존재
    //   )
    //   await page.getByRole('button', { name: /AI Fitting · / }).click()
    await expect(page.getByText('플랜 업그레이드 필요')).toBeVisible()
  })

  /**
   * Given: 결과 화면 + 모델 업로드 (Pro 이상이나 잔액 < 필요 크레딧)
   * When: AI Fitting 생성 클릭 → 서버 402 (크레딧 부족)
   * Then: CreditGuardModal '크레딧이 부족해요' 가 노출된다
   *
   * 서버 근거: credit-guard.ts:130 creditsLeft < required →
   *   402 reason='크레딧이 부족합니다. (필요: N, 잔여: M)'(="Pro" 미포함)
   *   → studio/page.tsx:498 reason='insufficient_credits' → 모달 제목 '크레딧이 부족해요'.
   */
  test.skip('크레딧 부족: 잔액 < 필요 시 크레딧 부족 모달', async ({ page }) => {
    // SKIP 사유: Pro 인증 세션 + credits_left 사전 세팅(예: 3) + 결과 화면 진입 필요.
    await gotoStudioResult(/* page */)
    // TODO: 모델 업로드 → 3장(5크레딧) 선택 상태로 생성 클릭
    await expect(page.getByText('크레딧이 부족해요')).toBeVisible()
  })

  /**
   * Given: 결과 화면 + Pro 세션 + 충분한 크레딧 + 유효 Google 키
   * When: 모델 사진 업로드 후 AI Fitting 생성 (3장)
   * Then: 30~90초 내 fitting 3장 + 비율 chip 3개 + 다운로드 버튼이 노출되고,
   *       user_profiles.credits_left 가 -5, usage_events(ai_fitting_generated) 가 기록된다
   *
   * ⚠️ 완전 라이브 — 자동화 범위 외. 픽스처(test-model.jpg) + 인증 Pro + Google 키 + 시간 필요.
   *   크레딧 델타 검증은 화면 카운터가 아니라 DB/재조회로 한다(R-4: 핸들러가 화면값 미감소).
   *   수동 절차는 docs/E2E_AI_FITTING.md §4-A 참조.
   */
  test.skip('[LIVE] 모델 업로드 → 3장 생성 → 결과/크레딧 -5 (수동 전용)', async () => {
    // page 인자는 수동 전용 스텁이라 사용하지 않음 (no-unused-vars 회피)
    // 이 테스트는 의도적으로 미구현 — 수동 체크리스트(docs/E2E_AI_FITTING.md §4-A)로 대체.
    expect(true).toBe(true)
  })
})
