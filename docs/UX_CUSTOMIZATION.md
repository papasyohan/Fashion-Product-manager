# UX Customization Loop — 6 Layer 가이드

ProductCraft AI 의 사용자 보정·재생성 워크플로우 설계 문서.

**원칙**: 사용자가 프롬프트를 직접 쓰는 게 아니라, 잘 만든 컨트롤이 곧 프롬프트로 번역되게 한다.

---

## 1. 6개 인터랙션 레이어

```
┌──────────────────────────────────────────────────────────────┐
│  업로드 → [L1 의도] → [L2 분석] → 생성 → [L3 편집] [L4 재생성] │
│                  │                                            │
│                  └─→ [L5 변형 트레이] (Phase 2)               │
│                  └─→ [L6 썸네일 Pin & 재롤] (Phase 2)         │
└──────────────────────────────────────────────────────────────┘
```

| Layer | 단계 | 컴포넌트 | Phase |
|-------|------|----------|-------|
| **L1** Pre-Generation Intent | 업로드 직후 | `IntentForm` | 1 |
| **L2** Analysis Review | 분석 완료 후 (사이드바) | `AnalysisReviewCard` | 1 |
| **L3** Inline Result Edit | 결과 표시 후 | `EditableText` | 1 |
| **L4** Per-section Regenerate | 결과 표시 후 | `RegenerateMenu` | 1 |
| **L5** Variants Tray | 재생성 누적 | `VariantsTray` | 2 |
| **L6** Studio Pin & Re-roll | 썸네일 후 | `ThumbnailPinControls` | 2 |

---

## 2. Layer 1 — Pre-Generation Intent

### 화면 위치
업로드 완료 직후, 모드 선택 다음. **선택사항** — "건너뛰기" 큰 버튼 제공.

### UI 사양
```
톤    [캐주얼] [감성] [프리미엄] [위트있게]
타깃  [20대 여성] [30대 남성] [시니어] [학생]
채널  [스마트스토어] [쿠팡] [무신사] [인스타]
📝 한 줄 요청 (선택)
[textarea, max 200자]
```

### Zustand State
```typescript
interface UserIntent {
  tone?: 'casual' | 'emotional' | 'premium' | 'witty'
  audience?: string         // chip + free-form
  channel?: 'naver' | 'coupang' | 'musinsa' | 'instagram'
  memo?: string             // 자유 메모
}
```

### 프롬프트 주입
```
[사용자 의도]
- 톤: 프리미엄
- 타깃: 30대 남성
- 채널: 무신사
- 추가 요청: "가볍고 슬림한 느낌 강조"
```

---

## 3. Layer 2 — Analysis Review (자동 진행, B=1)

### 핵심 의사결정
**B=1 자동 진행**: 분석 완료 후 멈추지 않고 다음 단계 진행. 분석 결과는 우측 사이드바에 살짝 표시. 사용자가 클릭하면 편집 가능.

### 화면 위치
- 데스크탑: 결과 화면 우측 고정 사이드바
- 모바일: 하단 collapsible drawer

### UI 사양
```
┌─ AI 분석 결과 ──────────[✎]┐
│ 카테고리   텀블러            │
│ 스타일     미니멀, 캠퍼스    │
│ 타깃       대학생            │
│ 핵심 특징                   │
│   • 보온성                  │
│   • 가벼움                  │
│   • 그립감                  │
│ 키워드                      │
│   #보냉 #데일리 #캠퍼스      │
│                            │
│  [✎ 분석 수정]              │
└────────────────────────────┘
```

### 사후 편집 동작
- 클릭 시 카드가 펼쳐지며 모든 필드 편집 가능
- "변경 사항 저장" 클릭 → DB 업데이트 + 클라이언트 store 동기화
- 변경 후 결과 카드들 옆에 "분석이 수정됐어요. 다시 생성할까요?" 토스트 노출
- 토스트 클릭 시 모든 작업 동시 재생성 (또는 개별 ↻ 사용)

### Zustand State
```typescript
interface AnalysisOverride {
  category?: string
  style?: string
  targetAudience?: string
  keyFeatures?: string[]
  keywords?: string[]
}
// store.updateAnalysis(patch) → 현재 analysis 와 머지
```

---

## 4. Layer 3 — Inline Result Edit

### 적용 대상
- 상품명 (옵션 3개 각각)
- 한줄 카피
- 상세 설명 (textarea 모드)

### 컴포넌트
```typescript
<EditableText
  value={text}
  onSave={(newText) => store.updateGeneration(genId, newText)}
  multiline={false}       // 설명은 true
  maxLength={40}           // 상품명 40, 카피 35, 설명 800
/>
```

### 인터랙션
1. 클릭 → `contentEditable=true` + 텍스트 선택
2. 키 입력 → 실시간 length counter 표시
3. ESC → 취소, Enter (또는 blur) → 저장
4. 저장 시 `user_edited=true` DB 기록 + 시각적 표시 ("✏️ 직접 수정함")

### Maximum length 검증
- 초과 시 input 색이 #d30005, 카운터 빨강
- Enter 차단

---

## 5. Layer 4 — Per-section Regenerate

### UI 사양
각 결과 카드 우상단 `[↻ 다시]` 버튼 → 풀다운:

```
같은 의도로 다시
─────────────────
더 짧게
더 트렌디하게
더 고급스럽게
더 캐주얼하게
─────────────────
📝 직접 입력…
```

### 직접 입력 모달
```
┌─ 상품명만 다시 생성 ──────────────┐
│ 📝 어떻게 바꿀까요?              │
│ [textarea, max 300자]            │
│                                  │
│ ☑ 분석 결과 유지                 │
│ ☑ 카피·설명 유지                 │
│                                  │
│  [취소]  [상품명만 재생성]        │
└──────────────────────────────────┘
```

### 백엔드
```typescript
// POST /api/generate/naming
{
  category: string
  keywords: string[]
  // 신규 필드
  userIntent?: UserIntent
  refinement?: string      // "더 짧게" 또는 자유 입력
}
```

내부 처리:
1. 프롬프트 builder 가 userIntent + refinement 를 자동 주입
2. 결과를 DB `generations` 에 INSERT, `parent_id` = 기존 generation 의 id
3. 응답은 새 결과만 — 클라이언트가 store 의 variants 배열에 push (Phase 2 활성화 시)

### Phase 1 정책
- 변형 누적 (Variants Tray) 은 Phase 2 이므로, 일단은 **덮어쓰기** 로 처리
- Phase 1 도 DB 에 parent_id 는 기록 (Phase 2 마이그레이션 시 데이터 활용)

---

## 6. Layer 5 — Variants Tray (Phase 2)

생성 결과를 덮어쓰지 않고 누적. parent_id 트리로 시간순 정렬.

```
01. 상품명 ─[↻ 다시]─
  ▾ 1차 (12:34)
    ○ A1  ● A2 (선택됨)  ○ A3
  ▾ 2차 (12:36) — "더 트렌디하게"
    ○ B1  ○ B2  ○ B3
```

---

## 7. Layer 6 — Studio Pin & Re-roll (Phase 2)

```
[1:1 📌]  [4:5 ○]  [9:16 ○]  [16:9 📌]
📝 핀 안 된 사진은 어떻게?
[textarea] → 핀 유지 + 나머지 재생성
```

---

## 8. usage_events 추가 이벤트

Phase 1 측정용:

| event_type | trigger |
|-----------|---------|
| `intent_used` | IntentForm 에서 최소 1개 chip 선택 후 생성 |
| `analysis_edited` | AnalysisReviewCard 에서 필드 수정 후 저장 |
| `text_edited` | EditableText 로 결과 텍스트 직접 수정 |
| `partial_regen` | RegenerateMenu 에서 프리셋 선택 |
| `refinement_used` | RegenerateMenu 직접 입력 사용 |

---

## 9. Phase 1 컴포넌트 위치 매핑

| 컴포넌트 | 경로 | 주요 props |
|---------|------|-----------|
| `IntentForm` | `src/components/intent-form/index.tsx` | `value, onChange, onSubmit, onSkip` |
| `AnalysisReviewCard` | `src/components/analysis-review-card/index.tsx` | `analysis, onUpdate, onRegenerateAll` |
| `EditableText` | `src/components/editable-text/index.tsx` | `value, onSave, multiline, maxLength` |
| `RegenerateMenu` | `src/components/regenerate-menu/index.tsx` | `onPreset, onCustom, presets[], section` |

## 10. 통합 위치

| 위치 | 추가/수정 |
|------|----------|
| `src/app/(app)/studio/page.tsx` | IntentForm 단계 추가 + AnalysisReviewCard 사이드바 통합 |
| `src/components/result-card/index.tsx` | EditableText 적용 + RegenerateMenu 통합 |
| `src/lib/prompts/intent-injector.ts` | **신규** — 모든 프롬프트가 호출하는 의도/보정 주입기 |
| `src/lib/prompts/{analyze,naming,tagline,description}.ts` | `buildXPrompt` 함수가 `intent-injector` 사용 |
| `src/lib/ai/types.ts` | `UserIntent` 타입 + 모든 agent input 시그니처에 옵셔널로 추가 |
| `src/store/studio.ts` | `userIntent`, `analysisOverride`, `setIntent`, `updateAnalysis` 액션 추가 |

---

## 11. 마이그레이션 적용 절차

```bash
# Supabase Dashboard SQL Editor 에서 직접 실행
# 또는: supabase db push (CLI 연동 시)

# 마이그레이션 파일 위치:
# supabase/migrations/007_user_intent_and_variants.sql
```

적용 후 `pnpm dlx supabase gen types --project-id <ID> > src/types/supabase.ts` 로 타입 재생성 권장.
Phase 1 에서는 수동 타입 정의로 진행 (`src/types/supabase.ts` 직접 수정).
