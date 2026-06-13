# AI Fitting — 실사용자 E2E 검증 (정적 코드패스 + 수동 체크리스트)

> 워크스트림 ② — Phase 4 "D안" AI Fitting 흐름의 정적 코드패스 검증 + 수동 브라우저 체크리스트.
> 작성: 코드 리딩 기반 정적 검증 (실제 헤드리스 파일 업로드 자동화는 불가하므로 라이브 E2E 는 범위 외).
> 동반 스캐폴드: `e2e/ai-fitting.spec.ts` (Playwright stub — 설치 불필요, 자동화 가능 부분만).
>
> 참고: 이 문서는 **앱 소스를 일절 수정하지 않습니다**. 발견된 불일치/버그는 §6 risks 에만 기록합니다.

---

## 0. 검증 대상 코드패스 (한눈에 보기)

```
[클라이언트]
 AIFittingPanel (src/components/ai-fitting-panel/index.tsx)
   · 비율 체크박스(1:1 / 4:5 / 9:16) + 채널 힌트 + 동적 크레딧 라벨  ← "Phase 4 D안", 재설계 금지
   · handleGenerate() → p.onGenerate(Array.from(selectedRatios))
        │
        ▼  (ResultCard 가 prop 을 remap)
 ResultCard (src/components/result-card/index.tsx:308-312)
   · onGenerate = (mode === 'quick') ? quick-CTA : onGenerateAIFitting
        │
        ▼
 studio/page.tsx handleAIFitting (src/app/(app)/studio/page.tsx:456-522)
   · productImageUrl: URL 전용 (store.uploadedImageUrl) — base64 전송 안 함
   · modelImageBase64: 새 업로드 / modelImageUrl: 재사용
   · aspectRatios: 사용자가 선택한 비율만
   · POST /api/generate/ai-fitting

[서버]
 POST /api/generate/ai-fitting (src/app/api/generate/ai-fitting/route.ts)
   1. supabase.auth.getUser()                       → 401 (미인증)
   2. FittingSchema.safeParse (Zod)                 → 400 (검증 실패)
        · productImageUrl: .url().refine(isSafeImageUrl)   (SSRF, SEC-02)
        · *Base64: .max(MAX_BASE64_LENGTH=27,000,000)      (20MB 상한, SEC-08)
   3. 서버측 해상도 결정 — 플랜 해상도 조회 → 4K 면 2K 로 다운그레이드
   4. requiredCredits = aiFittingCredits(aspectRatios.length)   (1→2 / 2→4 / 3→5 / 4+→6)
   5. checkCreditGuard({ operation:'studio_fitting', creditsOverride })  → 402
        · OPERATION_PLAN_GATE.studio_fitting = ['pro','business']   (Pro 이상 게이트)
        · creditsLeft < required                                    (크레딧 부족)
   6. modelImageBase64 경로일 때: extractSafeMimeType() MIME 화이트리스트 (SEC-04) → 400
        · Storage(ai-fittings/) 업로드 + last_model_image_url 갱신 (graceful: 실패해도 진행)
   7. NanaBanana2Provider.generate({ referenceImages:[제품,모델], aspectRatios, ... })
   8. record_ai_fitting_generation RPC (migration 011)
        · ai_fittings INSERT + usage_events INSERT + credits_left 차감 = 단일 트랜잭션
   9. 200 { fittings, modelImageUrl, projectId, elapsedMs }
```

---

## 1. 정적 코드패스 검증 — 체크포인트별 CORRECT / ISSUE 판정

| # | 체크포인트 | 위치 (file:line) | 판정 | 근거 |
|---|-----------|-----------------|------|------|
| 1 | 런타임이 Node 인가 | `route.ts:28` | ⚠️ PARTIAL | `export const runtime = 'nodejs'` **명시 export 없음**. 주석(`// Node Runtime`)만 존재. Next.js 16 기본값(Node)에 의존. Storage 업로드 + Google SDK 사용은 Node 가 필수이므로 **동작은 올바르나** "Node 런타임 확인" 을 명시 export 로는 확인 불가. → §6 R-2 |
| 2 | maxDuration = 90 | `route.ts:30` | ⚠️ DISCREPANCY | 실제 값은 **`maxDuration = 120`** (task 가 명시한 90 아님). 주석이 120 을 정당화: `참조이미지 fetch(20s) + 3비율 병렬 Gemini(65s) + Storage·DB(35s)`. 값을 임의 변경하지 않고 불일치만 기록. → §6 R-1, §7 결정 필요 |
| 3 | MIME 검증 (extractSafeMimeType) | `route.ts:124-130` / `security.ts:83-88` | ✅ CORRECT | base64 업로드 경로에서만 호출(URL 재사용 경로는 이미 Storage 검증 통과한 신뢰 URL). `^data:(image/...);base64,` 정규식 매칭 후 `ALLOWED_IMAGE_MIMES = {jpeg, png, webp}` 화이트리스트. 미통과 시 400 + `허용되지 않는 이미지 형식입니다...`. SVG/XSS 벡터 차단. |
| 4 | SSRF 방어 (productImageUrl / modelImageUrl) | `route.ts:38,42` / `security.ts:39-48` | ✅ CORRECT | Zod `.url().refine(isSafeImageUrl)`. `isSafeImageUrl` 은 https 만 허용 + 루프백/RFC-1918/169.254 메타데이터/CGNAT/IPv6 ULA 차단. 파싱 실패 시 false(방어적). |
| 5 | base64 크기 상한 | `route.ts:40,43` / `security.ts:72` | ✅ CORRECT | `.max(MAX_BASE64_LENGTH)` = 27,000,000자 (≈20MB 파일). 초과 시 400. 클라이언트는 추가로 10MB 제한(`ai-fitting-panel`:`MAX_SIZE_MB=10`) — 서버가 더 관대하므로 안전(서버가 최종 게이트). |
| 6 | 크레딧 동적 가격 (1/2/3/4장) | `credit-guard.ts:54-59` | ✅ CORRECT | `aiFittingCredits(count)`: `≤1→2`, `2→4`, `3→5`(할인), `4+→6`. (상세 §3 표) |
| 7 | Pro 이상 플랜 게이트 | `credit-guard.ts:27-29,107-117` | ✅ CORRECT | `OPERATION_PLAN_GATE.studio_fitting = ['pro','business']`. free/starter 면 402 + `AI Fitting 기능은 Pro 이상 플랜에서만 사용 가능합니다.` + `upgradeUrl:'/billing'`. |
| 8 | 크레딧 부족 가드 | `credit-guard.ts:130-137` | ✅ CORRECT | `creditsLeft < required` 면 402 + `크레딧이 부족합니다. (필요: N, 잔여: M)` + `creditsRequired` + `upgradeUrl`. |
| 9 | creditsOverride 가 정적 비용보다 우선 | `credit-guard.ts:104` / `route.ts:105-111` | ✅ CORRECT | `required = creditsOverride ?? CREDIT_COSTS[operation]`. 라우트가 `aiFittingCredits(n)` 를 override 로 전달 → 정적 `CREDIT_COSTS.studio_fitting=5` 가 아니라 비율 개수별 값이 실제 청구액. |
| 10 | 클라이언트 ↔ 서버 가격 로직 일치 | `ai-fitting-panel.tsx:64-69` vs `credit-guard.ts:54-59` | ✅ CORRECT | 두 함수(`ratiosToCredits` / `aiFittingCredits`) 분기 동일(2/4/5/6). 화면 라벨과 실제 청구 금액 불일치 없음. (단, 별도 함수라 향후 한쪽만 바꾸면 어긋날 수 있음 — §6 R-6 권고) |
| 11 | DB 기록 + 차감 원자성 | `route.ts:209-229` / migration 011:122-195 | ✅ CORRECT | `record_ai_fitting_generation` RPC 가 `ai_fittings INSERT + usage_events INSERT + credits_left UPDATE` 를 단일 PostgreSQL 트랜잭션으로 처리. 어느 단계 실패 시 전부 롤백 → 크레딧 이중차감/누락 방지(BUG-01). 프로젝트 소유권도 RPC 내부에서 재확인(`insufficient_privilege`). |
| 12 | 서버측 해상도 강제 (4K→2K) | `route.ts:89-101` | ✅ CORRECT | 클라이언트 전송 `resolution` 무시, 서버가 플랜 해상도 조회 후 `4K → 2K` 다운그레이드(멀티-레퍼런스 4K 는 504 유발). AI Fitting 상한 2K. |
| 13 | productImageUrl URL 전용 전송 | `studio/page.tsx:468-489` | ✅ CORRECT | 핸들러가 `store.uploadedImageUrl` 만 전송(base64 미전송) → 요청 바디 최소화, 타임아웃 회피. 서버는 URL 1회 fetch. |
| 14 | 모델 이미지 분기 (신규 base64 / 재사용 URL) | `studio/page.tsx:464-489` | ✅ CORRECT | `useBase64 = store.modelImageBase64`; `useUrl = store.modelImageUrl ?? (reuseLastModel ? lastModelImageUrl : null)`. `saveAsLastModel = !!useBase64`(새 업로드일 때만 last_model 갱신). |
| 15 | ResultCard prop remap (onGenerate→onGenerateAIFitting) | `result-card/index.tsx:308-312` | ✅ CORRECT | `onGenerate = mode==='quick' ? quick-CTA(setShowQuickCta) : (onGenerateAIFitting ?? noop)`. quick 모드에선 생성 대신 업그레이드 CTA. studio 모드에선 `handleAIFitting` 위임. |
| 16 | 402 → 모달 reason 매핑 | `studio/page.tsx:492-501` | ✅ CORRECT | 402 시 `gr.reason.includes('Pro') ? 'plan_required' : 'insufficient_credits'`. Pro 게이트 메시지에 "Pro" 포함 → `plan_required`(모달 제목 "플랜 업그레이드 필요"). 크레딧 부족 메시지엔 "Pro" 없음 → `insufficient_credits`(모달 제목 "크레딧이 부족해요"). |
| 17 | 패널 재설계 여부 (D안 보존) | `ai-fitting-panel/index.tsx` | ✅ CORRECT (미변경) | 체크박스 + 채널 힌트(`RATIO_OPTIONS`) + 동적 라벨(`AI Fitting · N장 · K크레딧`) 그대로. 본 워크스트림은 패널을 수정하지 않음. |
| 18 | 에러 핸들링 (사용자 친화 메시지) | `route.ts:242-256` | ✅ CORRECT | catch 에서 credit/quota/timeout/이미지 fetch 패턴별 한국어 메시지 분기, `debug` 에 원문. 단 200/402/400 외 실패는 모두 500(아래 R-7). |

**총평:** 핵심 보안(SSRF·MIME·크기), 동적 가격, Pro 게이트, 원자적 차감, URL-전용 전송, prop remap, 모달 매핑 모두 **CORRECT**. 실버그가 아닌 *불일치/명시성/동시성 경계* 항목 4건은 §6 risks 로 분리.

---

## 2. 크레딧 동적 가격 — 검증 표 (1/2/3/4장)

서버 `aiFittingCredits()` (`credit-guard.ts:54-59`) 와 클라이언트 `ratiosToCredits()` (`ai-fitting-panel/index.tsx:64-69`) 교차 검증.

| 선택 비율 수 | 서버 `aiFittingCredits(n)` | 클라이언트 `ratiosToCredits(n)` | 화면 라벨 (버튼) | 일치 |
|:---:|:---:|:---:|:---|:---:|
| 0장 | — (생성 차단) | — | `비율 선택 필요` (버튼 disabled) | n/a |
| 1장 | `2` | `2` | `AI Fitting · 1장 · 2크레딧` | ✅ |
| 2장 | `4` | `4` | `AI Fitting · 2장 · 4크레딧` | ✅ |
| 3장 (기본) | `5` (할인) | `5` | `AI Fitting · 3장 · 5크레딧` | ✅ |
| 4장+ | `6` | `6` | `AI Fitting · 4장 · 6크레딧` | ✅ |

> 비율 헤더의 보조 라벨(`ai-fitting-panel/index.tsx:172-174`)은 띄어쓰기가 다름: **`N장 · K 크레딧`** (크레딧 앞 공백 O).
> 생성 버튼 라벨(`:330`)은 **`AI Fitting · N장 · K크레딧`** (공백 X). 셀렉터 작성 시 주의(§ Playwright stub 에 반영).

> ⚠️ UI 상으로는 1:1/4:5/9:16 **3개 비율만** 노출되므로 정상 사용 시 최대 3장(5크레딧)까지만 선택 가능.
> "4장+→6" 분기는 서버가 `FittingSchema.aspectRatios` 로 최대 6종(`1:1,4:5,9:16,16:9,4:3,3:4`)을 허용하므로 **API 직접 호출/향후 UI 확장** 대비 방어 코드. 현 UI 에서는 도달 불가.

---

## 3. 가드 / 상태 코드 매트릭스

| 상황 | HTTP | 응답 body 핵심 | 클라이언트 처리 |
|------|:---:|----------------|-----------------|
| 미인증 | 401 | `{ error:'인증 필요' }` | (studio 는 로그인 가드 하위라 실질 도달 드묾) |
| 스키마 검증 실패 | 400 | `{ error: zodFlatten }` | `res.json().catch` → throw → 패널 에러 표시 |
| 제품/모델 이미지 누락 | 400 | `{ error:'제품/모델 이미지가 필요합니다.' }` | 동일 |
| MIME 불허(base64) | 400 | `{ error:'허용되지 않는 이미지 형식입니다...' }` | 동일 |
| Pro 미만 플랜 | 402 | `{ error, upgradeUrl, guardResult }` (reason 에 "Pro") | `plan_required` 모달 ("플랜 업그레이드 필요") |
| 크레딧 부족 | 402 | `{ error, guardResult.creditsRequired }` | `insufficient_credits` 모달 ("크레딧이 부족해요") |
| 생성/DB 실패 | 500 | `{ error: 친화 메시지, debug }` | throw → 패널 에러 표시 |
| 성공 | 200 | `{ fittings, modelImageUrl, projectId, elapsedMs }` | `store.setAiFittings(items)` |

---

## 4. 수동 E2E 테스트 체크리스트 (브라우저)

> **선행 조건**
> - 로그인된 사용자. 케이스별 플랜/크레딧을 DB(`user_profiles.plan`, `user_profiles.credits_left`)에서 사전 세팅.
> - 픽스처 이미지: 제품 사진 1장(스튜디오 모드 업로드용) + 모델 사진 1장(JPG/PNG/WebP, 10MB 이하).
> - `.env.local` 에 `DEV_BYPASS_CREDITS=true` 가 **설정되어 있지 않아야** 함 (설정 시 가드 전체 스킵 → 가드 테스트 무의미). `GOOGLE_*` 키 유효해야 실제 생성 성공.
> - AI Fitting 패널은 **결과 화면(`store.status==='done'`)**에서만 노출됨 → 먼저 스튜디오 모드로 1회 생성을 완료해야 패널이 보임.

### 4-0. 공통 셋업 (결과 화면 진입)
1. `/studio` 접속 → "스튜디오 모드" 선택.
2. (의도 입력 단계가 뜨면) 건너뛰기 또는 입력 후 진행.
3. 제품 픽스처 이미지 업로드 → 파이프라인 완료 대기(상단 진행률 100% → "생성 완료").
4. 결과 화면 하단으로 스크롤 → **"AI Fitting" 안내 박스 + 비율 선택 + 3-패널 레이아웃**이 보이는지 확인.
   - 기대: 안내 박스에 "✨ AI Fitting", "(Pro 이상 · 비율 개수별 차등 크레딧)" 문구. SynthID 고지.

### 4-A. 정상 생성 — 크레딧 델타 (Pro 이상 플랜, 크레딧 충분)
사전: `plan='pro'`(or `business`), `credits_left` 충분(예: 100). 각 케이스 전 `credits_left` 메모.

| 케이스 | 선택 비율 | 버튼 라벨(기대) | 기대 결과 | 기대 크레딧 델타 |
|---|---|---|---|---|
| A-1 | 1:1 만 (1장) | `AI Fitting · 1장 · 2크레딧` | fitting 1장 생성, 우측 패널에 결과 + 비율 chip 1개 | **-2** |
| A-2 | 1:1, 4:5 (2장) | `AI Fitting · 2장 · 4크레딧` | fitting 2장, chip 2개 | **-4** |
| A-3 | 1:1, 4:5, 9:16 (3장, 기본) | `AI Fitting · 3장 · 5크레딧` | fitting 3장, chip 3개 | **-5** |
| A-4 | (4장 — 현 UI 불가, API 직접 호출 시) | `... · 4장 · 6크레딧` | fitting 4장 | **-6** |

검증 절차(각 케이스):
1. 비율 체크박스로 원하는 조합 선택. 비율 헤더 보조 라벨이 `N장 · K 크레딧` 으로, 생성 버튼이 `AI Fitting · N장 · K크레딧` 으로 갱신되는지 확인.
2. 모델 픽스처 업로드(중앙 패널 "모델 업로드") → 미리보기 노출 확인.
3. 생성 버튼 클릭 → "AI Fitting 진행 중 (약 30초~1분)" → 완료 후 우측 결과 + 비율 chip 수 = 선택 비율 수.
4. **크레딧 델타 검증은 화면 카운터가 아니라 DB/재조회로 확인** (R-4 참고: 핸들러가 화면 `creditsLeft` 를 감소시키지 않음 — 페이지 새로고침 또는 `user_profiles.credits_left` 조회로 확인).
   - `select credits_left from user_profiles where id = <uid>` → 이전값 − {2/4/5/6} 와 일치.
   - `select credits_used, metadata from usage_events where event_type='ai_fitting_generated' order by created_at desc limit 1` → `credits_used` = 기대 델타, `metadata.count` = 비율 수.
5. (재사용) 같은 모델로 한 번 더 생성 시 "같은 모델 ✓" 토글 → `modelImageUrl`(URL) 재전송, Storage 재업로드 없음(요청 바디 작음).

### 4-B. Pro+ 게이팅 (플랜 미달)
사전: `plan='free'`(or `starter`), `credits_left` 충분.
1. 4-0 으로 결과 화면 진입(주의: free 플랜이라도 스튜디오 1회 생성은 별도 비용 — 필요 시 크레딧 충전 또는 임시 Pro 로 셋업 후 결과 화면 진입한 뒤 plan 을 free 로 강등).
2. 모델 업로드 후 AI Fitting 생성 클릭.
3. 기대: 네트워크 `POST /api/generate/ai-fitting` → **402**, body.error = `AI Fitting 기능은 Pro 이상 플랜에서만 사용 가능합니다.`
4. 기대 UI: **CreditGuardModal — 제목 "플랜 업그레이드 필요"** (reason=`plan_required`). 크레딧 차감 없음(델타 0). usage_events 미기록.

### 4-C. 크레딧 부족 (Pro 이상이나 잔액 < 필요)
사전: `plan='pro'`, `credits_left = 3` (3장=5크레딧 필요 < 3).
1. 4-0 결과 화면 진입.
2. 비율 3장(5크레딧) 선택 → 모델 업로드 → 생성 클릭.
3. 기대: `POST /api/generate/ai-fitting` → **402**, body.error = `크레딧이 부족합니다. (필요: 5, 잔여: 3)`, body.guardResult.creditsRequired = 5.
4. 기대 UI: **CreditGuardModal — 제목 "크레딧이 부족해요"** (reason=`insufficient_credits`), "현재 잔여 크레딧: 3개 · 필요: 5개". 차감 없음. usage_events 미기록.
5. (경계) 비율 1장(2크레딧)으로 줄이면 잔액 3 ≥ 2 → 정상 생성, 델타 -2 (→ 잔액 1).

### 4-D. 입력 검증 / 보안 (선택, API 레벨)
1. **MIME 우회**: 개발자도구로 `modelImageBase64` 를 `data:image/svg+xml;base64,...` 로 위조 후 전송 → **400** `허용되지 않는 이미지 형식입니다...`.
2. **SSRF**: `productImageUrl = "http://169.254.169.254/..."` 직접 전송 → Zod refine 실패 → **400** `허용되지 않는 이미지 URL입니다.` (http 라 프로토콜에서도 거부).
3. **크기 초과**: 27,000,000자 초과 base64 → **400** `이미지 크기가 초과되었습니다. (최대 20MB)`.

### 4-E. 결과 후속 동작
1. 우측 결과의 비율 chip 클릭 → hero 전환되는지(`onSelectHero`).
2. "다운로드" 버튼 → `ai-fitting-<ratio>.png` 다운로드.
3. 페이지 새로고침 후 다시 결과 화면 진입 시(히스토리 경유) 동작/잔여 크레딧 정합 확인.

---

## 5. 픽스처 / 참고 노트

- **픽스처 디렉터리:** 기존 E2E 는 `tests/fixtures/test-product.jpg` 를 참조(`tests/e2e/studio-mode.spec.ts:31`). 모델 픽스처(`test-model.jpg` 등)는 아직 없음 → 수동 테스트 시 직접 준비.
- **AI Fitting 패널 가시성:** 결과 화면에서만 렌더(`studio/page.tsx:589` `status==='done'` 분기). 패널은 `result-card` 내부에서 `next/dynamic` 으로 지연 로드(`result-card/index.tsx:33`).
- **DEV_BYPASS_CREDITS:** `true` 면 `checkCreditGuard` 와 `deductCredits` 모두 우회(`credit-guard.ts:66, 161`). **가드/크레딧 테스트 전 반드시 해제**.
- **maxDuration=120:** 라우트가 120초까지 대기 가능(task brief 의 90 과 불일치, §6 R-1). 3장 생성이 60~90초 걸릴 수 있어 수동 테스트 타임아웃을 넉넉히.

---

## 6. Risks / 발견 사항 (실버그 vs 불일치)

| ID | 심각도 | 항목 | 상세 | 권고 |
|---|---|---|---|---|
| R-1 | 정보(불일치) | `maxDuration` 90 vs 120 | task brief 는 90 을 명시하나 실제 `route.ts:30` 은 **120**. 주석이 120 을 타이밍으로 정당화. | 앱 소스 미수정. 오너가 90 강제할지 결정(§7). 라우트 소유 에이전트에 위임 필요. |
| R-2 | 정보(명시성) | `runtime` 명시 export 부재 | `export const runtime='nodejs'` 없음. Next.js 16 기본 Node 에 의존(Storage/Google SDK 동작은 정상). "Node 확인" 을 명시값으로는 불가. | 명확성 위해 명시 export 추가 권고(앱 소스라 본 워크스트림 범위 외 — flag only). |
| R-3 | 낮음(동시성) | TOCTOU — 차감이 조건부 RPC 미사용 | AI Fitting 은 `deduct_credits_atomic`(조건부, migration 012) 가 아니라 `record_ai_fitting_generation`(무조건 `GREATEST(credits_left - p_credits, 0)`, 011:189) 으로 차감. `checkCreditGuard`(읽기) 후 RPC(쓰기) 사이 경합 시 두 병렬 요청이 가드를 모두 통과 → 두 번째가 0 으로 clamp(= **과소 청구**, 이중 청구 아님). | clamp 라 과금 손해는 없으나 엄격한 동시성 필요 시 RPC 를 조건부 차감으로 하드닝. 별도 워크스트림(본 워크스트림 미수정). |
| R-4 | 낮음(UX) | 성공 후 화면 크레딧 미감소 | `handleAIFitting`(`studio/page.tsx:456-522`) 은 quick 모드(:317)와 달리 `setCreditsLeft` 를 호출하지 않음 → 화면 잔여 크레딧이 프로필 재로드 전까지 stale. | 수동 테스트는 화면 카운터 대신 DB/새로고침으로 델타 검증(§4-A.4 에 반영). 본 워크스트림 미수정(앱 소스). |
| R-5 | 정보 | Playwright 라벨 셀렉터 취약성 | 한국어 크레딧 라벨은 카피 변경에 취약. `5크레딧` 단순 매칭은 안내 박스의 정적 문구와도 충돌 가능 → 생성 버튼/비율 헤더로 셀렉터 스코프 한정(stub 에 반영). 라이브 업로드+생성 단계는 헤드리스 파일피커·인증 Pro·Google 키·실픽스처 필요 → `test.skip`. | stub 참조. |
| R-6 | 정보(유지보수) | 가격 로직 이중 정의 | `aiFittingCredits`(서버) 와 `ratiosToCredits`(클라이언트)가 별도 함수로 동일 분기 중복. 현재 일치하나 한쪽만 수정 시 라벨/청구 불일치 위험. | 단일 소스화(공유 util) 고려 — 앱 소스라 flag only. |
| R-7 | 정보 | 모든 비-가드 서버 실패가 500 | DB/생성 실패가 모두 500(친화 메시지+debug). 클라이언트는 `res.json().catch` 로 안전 파싱 후 throw → 패널이 에러 노출. 정보 누출 없음(에러는 사용자 친화 메시지). | 변경 불요. |

> **결론:** 요청된 모든 핵심 체크포인트(Node 실효 동작, MIME 검증, 동적 가격 1/2/3/4=2/4/5/6, Pro 게이트, 원자적 차감, prop remap, 모달 매핑)는 **코드상 올바르게 구현**. 실제 버그는 0건. 불일치/명시성/동시성 경계 7건은 위 표에 기록(R-1·R-2·R-4 는 오너/타 워크스트림 결정 사항).

---

## 7. 오너 결정 필요 사항 (앱 소스 변경 — 본 워크스트림 범위 외)

1. **maxDuration:** 현행 120 유지(타이밍 주석으로 정당) vs task brief 의 90 으로 변경? 변경 시 라우트 소유 에이전트에 위임.
2. **`runtime` 명시 export:** 명확성 위해 `export const runtime='nodejs'` 추가할지.
3. **TOCTOU(R-3):** AI Fitting 차감을 조건부 `deduct_credits_atomic` 로 하드닝할지(현행 clamp 허용 가능 여부).
4. **화면 크레딧 stale(R-4):** 성공 후 `setCreditsLeft(prev => prev - required)` 추가할지.

---

## 8. 동반 Playwright 스캐폴드

`e2e/ai-fitting.spec.ts` — 설치 불필요(스캐폴드). 자동화 가능 구간만:
- `/studio` 내비게이션 + 스튜디오 모드 진입.
- 비율 토글에 따른 생성 버튼 라벨 검증(`AI Fitting · 3장 · 5크레딧` ↔ 1/2장 → `2/4크레딧`).
- Pro+ 게이팅 UI(모달 제목) — 인증 세션 전제, 따라서 골격만.
- **파일 업로드 + 라이브 생성 단계는 `test.skip` / TODO** (실픽스처 + 인증 Pro 세션 + Google 키 필요).

> 주의: 레포에 `playwright.config.ts` 가 없고 기존 스펙은 `tests/e2e/` 에 위치(`package.json` `test:e2e: "playwright test"`). 신규 `e2e/` 디렉터리는 현 러너 글롭에 안 잡힐 수 있음 → 스텁은 스캐폴드 전용이며, 러너 설정 연결은 본 워크스트림 범위 외(package.json/config 미수정).
