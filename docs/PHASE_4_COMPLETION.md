# Phase 4 완료 보고서 — AI Fitting + History/Studio UI/UX 보완

> Phase 4 작업의 **결정·구현·검증** 내역. SESSION_HANDOFF.md 와 함께 다음 세션의 출발점.

---

## 1. 결정 사항 (D안 풀세트)

### D-1: 비율 선택 UI — **A: 체크박스**
1:1 / 4:5 / 9:16 을 사용자가 사전에 선택하고 변환 시작.
"AI Fitting" 클릭 후 선택 받는 모달 방식(B)은 클릭 1단계 추가 → 거부.

### D-2: 기본 선택 — **C: 3장 (1:1·4:5·9:16) 모두 체크**
대부분 사용자가 인스타+쇼핑몰 동시 운영 → 기본 풀세트로 시작, 빼는 것은 1클릭.

### D-3: 채널 힌트 표시 — **B: 라벨 하단 마이크로카피**
```
1:1   인스타 피드 · 스마트스토어 메인
4:5   인스타 세로 · 쿠팡 메인
9:16  인스타 스토리·릴스
```

### D-4: 동적 크레딧 — **A: 비율 개수별 차등**
```
1장 = 2 크레딧
2장 = 4 크레딧
3장 = 5 크레딧 (할인)
4장+ = 6 크레딧
```
헬퍼: `aiFittingCredits(count)` in `src/lib/credit-guard.ts`.

### D-5: 모델 사진 재사용 — **A: 자동 저장 + 매 상품 별 선택**
- `user_profiles.last_model_image_url` 자동 갱신
- 신규 상품 진입 시 "이전 모델 재사용" 토글 노출
- studio 모드에서 fitting 결과가 result-card 의 hero 로 표시 (사용자 선택)

---

## 2. 구현 파일 변경 (Phase 4 전체)

### 신규
- `src/app/api/generate/ai-fitting/route.ts` — POST 핸들러, Node Runtime, maxDuration=90
- `src/components/ai-fitting-panel/index.tsx` — 3-panel UI (원본 / 모델 / 결과)
- `src/lib/prompts/image/ai-fitting.ts` — 5-layer prompt builder
- `supabase/migrations/009_ai_fittings.sql` — 테이블 + Storage 안내

### 수정
- `src/lib/credit-guard.ts` — `studio_fitting` operation, `creditsOverride`, `aiFittingCredits()`, `OPERATION_PLAN_GATE`
- `src/lib/ai/image/nano-banana2-provider.ts` — `slice(0, 1)` → `slice(0, 5)`
- `src/store/studio.ts` — Phase 4 state + actions
- `src/app/(app)/studio/page.tsx` — `handleAIFitting(ratios)`, loading_history
- `src/components/result-card/index.tsx` — 04~07 섹션, selectedFittingUrl hero
- `src/app/api/generate/detail-page/route.ts` — hero 구조 title→tagline→image
- `src/app/(app)/history/history-client.tsx` — row hover + CTA
- `src/lib/ai/sse-client.ts` — onEvent throw 전파
- `src/lib/ai/router.ts` — isRetriableError 패턴 확장
- `src/lib/ai/types.ts` — 스키마 완화

---

## 3. 검증 (Chrome MCP 자동화)

| 항목 | 결과 |
|---|---|
| `/studio` 첫 진입 + 이미지 업로드 | ✅ |
| 분석 후 result-card 04 AI Fitting 섹션 노출 | ✅ |
| 체크박스 1:1·4:5·9:16 토글 | ✅ |
| 채널 힌트 마이크로카피 표시 | ✅ |
| 동적 라벨 "3장·5크레딧" ↔ "1장·2크레딧" | ✅ |
| 모델 사진 업로드 박스 노출 | ✅ |
| `/history` 행 hover + "결과 보기 →" CTA | ✅ |
| 행 클릭 시 loading_history 화면 + 썸네일 프리뷰 | ✅ |
| Admin 메뉴 노출 (yohan73@gmail.com / yohan@papascompany.co.kr) | ✅ |
| Vercel 배포 (`19f7095`) | ✅ |
| Supabase migration 009 적용 | ✅ |
| Storage `ai-fittings/` 버킷 생성 | ✅ |

**미검증 (다음 세션):**
- 실제 모델 사진 업로드 → multi-reference 합성 결과 품질
- Pro 미만 플랜에서 차단 메시지
- 비율별 결과 이미지 다운로드 정상 동작

---

## 4. 핵심 코드 스니펫 (참고용)

### 동적 크레딧 헬퍼
```typescript
// src/lib/credit-guard.ts
export function aiFittingCredits(count: number): number {
  if (count <= 1) return 2
  if (count === 2) return 4
  if (count === 3) return 5
  return 6
}
```

### 체크박스 채널 힌트 옵션
```typescript
// src/components/ai-fitting-panel/index.tsx
const RATIO_OPTIONS = [
  { value: '1:1',  channel: '인스타 피드 · 스마트스토어 메인' },
  { value: '4:5',  channel: '인스타 세로 · 쿠팡 메인' },
  { value: '9:16', channel: '인스타 스토리·릴스' },
]
```

### Operation Plan Gate
```typescript
const OPERATION_PLAN_GATE: Partial<Record<Operation, Plan[]>> = {
  studio_fitting: ['pro', 'business'],
}
```

### multi-reference [제품, 모델] 호출
```typescript
const referenceImages = [productImage, modelImage]
const prompt = buildAiFittingPrompt({ category, productKeyFeatures, aspectRatio, refinement })
const genResult = await provider.generate({
  referenceImages,
  prompt,
  aspectRatios,
  count: 1,
  resolution,
})
```

---

## 5. 운영 가드 정리

- Pro+ 전용 (`OPERATION_PLAN_GATE.studio_fitting = ['pro', 'business']`)
- 4K 해상도는 Pro+ 전용 (`RESOLUTION_PLAN_GATE['4K']`)
- 동적 크레딧은 `creditsOverride` 로 검사 + 차감 모두 일관
- DB 차감은 `deduct_credits` RPC (SECURITY DEFINER) 사용
- `usage_events` 에 모든 fitting 호출 기록 (분석/감사용)

---

## 6. 다음 세션 즉시 할 일 (제안 순서)

1. **운영 상태 더블체크** — `vercel logs productcraft-ai` 최근 에러 확인
2. **사용자가 선택한 다음 옵션 진행** — SESSION_HANDOFF.md §7 의 4가지 중
3. fitting 실 테스트 시: 사용자가 모델 사진 직접 업로드 후 결과 검증

마지막 배포 커밋: `19f7095`
배포 시각: 2026-05-21 (KST)
