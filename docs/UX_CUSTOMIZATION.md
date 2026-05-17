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

### 데이터 모델

```typescript
interface VariantsState {
  naming:      NamingResult[]       // 각 항목은 3종 상품명 1세트
  tagline:     TaglineResult[]
  description: DescriptionResult[]
}
interface VariantsActiveIndex {
  naming: number       // 현재 표시 중인 variant 인덱스
  tagline: number
  description: number
}
```

- 초기 생성: `variants.naming = [first]`, `activeIndex.naming = 0`
- 재생성 시: `variants.naming.push(new)`, `activeIndex.naming = length - 1`
- `result.names` 는 `variants.naming[activeIndex.naming].names` 의 derived view
- 사용자가 트레이에서 다른 variant 클릭 시 `selectVariant` 액션 → `result` 도 함께 갱신

### UI 사양

각 결과 섹션 헤더 아래 variants nav 추가:

```
01. 상품명 3종 ─────────────[📌 Lock]─[↻ 다시]──
  ┌────┬────┬────────────────┐
  │ 1차 │ ●2차 │ + 추가 (3차)  │  ← 가로 chip 행
  └────┴────┴────────────────┘
  (활성 variant 의 3개 옵션이 아래 카드로 표시)
```

- variant chip: 1차 / 2차 / 3차…
- 활성 변형은 검정 배경 + 흰 글자
- hover 시 refinement 텍스트가 툴팁으로 노출 (예: "더 트렌디하게")
- 1차만 있으면 nav 숨김 (UI 노이즈 회피)

### 액션

```typescript
addVariant<K>(kind: K, result: VariantsState[K][number], refinement?: string) => void
selectVariant<K>(kind: K, index: number) => void
clearVariants<K>(kind: K) => void   // 1차만 남기고 정리
```

---

## 6-A. Layer 5-B — Lock & Iterate (Phase 2)

각 결과 섹션 헤더에 📌 잠금 토글. 잠긴 상태에서는:
- RegenerateMenu 비활성 (시각적으로 회색 + 클릭 차단)
- 전체 재생성 시 해당 섹션 스킵 (현재 결과 유지)

### 신규 액션: "전체 재생성"

결과 화면 상단에 [↻ 모든 결과 다시 생성] 버튼 (잠겨있지 않은 섹션이 1개 이상일 때만 활성).

```typescript
async function regenerateAll() {
  const tasks: Promise<unknown>[] = []
  if (!locks.naming)      tasks.push(handleRegenerateNaming())
  if (!locks.tagline)     tasks.push(handleRegenerateTagline())
  if (!locks.description) tasks.push(handleRegenerateDescription())
  await Promise.all(tasks)
}
```

분석을 수정한 후 토스트의 "다시 생성" 도 이 동일 액션을 호출.

---

## 7. Layer 6 — Studio Pin & Re-roll (Phase 2)

### UI 사양
```
┌─ 썸네일 ─[↻ 핀 안 된 것만 다시]──
│  [1:1 📌] [4:5 ○] [9:16 ○] [16:9 📌]   ← 클릭으로 핀 토글
│
│  핀 안 된 사진은 어떻게?
│  [textarea — refinement, max 200]
│
│       [핀 유지 + 나머지 재생성]
└─
```

### 데이터 모델
- 클라이언트 store: `Set<string>` (aspect ratio 기준)
- `/api/generate/thumbnail` 요청 body 에 `pinnedAspectRatios: string[]` 추가
- 서버: `aspectRatios.filter(ar => !pinned.includes(ar))` 만 재생성
- 응답: 새로 생성된 것만 반환 → 클라이언트가 핀된 것과 머지

### 4K 해상도 게이팅

```
[1K 무료] [2K Starter+] [4K Pro+ 🔒]
```

- 사용자 plan 미달 시 옵션 비활성 + 🔒 + 클릭 시 CreditGuardModal
- 의도 입력 단계(IntentForm) 에 "썸네일 해상도" 컨트롤 추가 (Studio 모드만)
- 현재 plan 은 `app-nav` 에서 표시 중인 정보 재활용

---

## 7-A. Layer 7 — Trend Keywords 사용자 편집 (Phase 2)

### 위치
AnalysisReviewCard 내부의 별도 섹션 "트렌드 키워드".

### 데이터
- 현재 trend-fetcher 는 카테고리별 정적 fallback 반환
- store 에 `trendKeywords: string[]` 필드 추가
- pipeline SSE 의 `names` 이벤트가 `trendTags` 를 함께 emit (이미 함)
- 사이드바에서 chip 추가/삭제 가능
- 부분 재생성 시 `keywords` 와 `trendKeywords` 둘 다 전달

---

## 7-B. Layer 8 — 상세페이지 풀 노션 스타일 에디터 (Phase 2 · C=3 결정)

### 컨셉
정적 HTML 템플릿(현재) → **사용자가 자유롭게 편집/순서변경/추가/삭제 가능한 섹션 기반 에디터**.

LLM 으로 섹션 내용 재생성은 Phase 3 (G5 상세페이지 LLM 조립) 로 이관 — Phase 2 는 **편집기 자체**에 집중.

### 섹션 타입
```typescript
type DetailSection =
  | { id: string, type: 'hero',         title: string, tagline: string, image?: string }
  | { id: string, type: 'features',     heading: string, items: string[] }
  | { id: string, type: 'description',  content: string }
  | { id: string, type: 'keywords',     items: string[] }
  | { id: string, type: 'reviews',      placeholder: string }
  | { id: string, type: 'cta',          label: string, url?: string }
  | { id: string, type: 'text',         heading?: string, content: string }
  | { id: string, type: 'image',        url: string, caption?: string }
```

### 컴포넌트 구조
- `DetailPageEditor` (메인) — 섹션 배열을 받아 렌더링
- 각 섹션 타입별 sub-component (`HeroBlock`, `FeaturesBlock`, ...)
- 모든 텍스트는 `EditableText` 재사용

### 인터랙션
1. **드래그 정렬** — 섹션 좌측 핸들(⋮⋮) 드래그. HTML5 native drag-and-drop.
2. **섹션 추가** — 섹션 사이에 hover 시 [+ 추가] 라인 노출 → 풀다운으로 type 선택
3. **섹션 삭제** — 섹션 우상단 ⋯ 메뉴에서 "삭제"
4. **인라인 편집** — 모든 텍스트 클릭으로 EditableText 활성

### 저장 & 내보내기
- 편집 결과는 클라이언트 store (`detailPageSections`) 에 저장
- "HTML 내보내기" 버튼 → 기존 `assembleDetailPage` 함수에 sections 배열을 전달하여 HTML 생성
- "프로젝트와 함께 저장" 클릭 시 `/api/generate/detail-page` 호출 (sections payload 추가)

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

**Phase 2 추가 마이그레이션 필요 없음** — 007 이 이미 parent_id / locked / is_pinned 모두 추가했음.

**Phase 3 추가 마이그레이션 필요 없음** — 새 DB 컬럼 없음. (Admin 은 별도 008 필요)

---

## 14. Phase 3 — Power Features

### 14.1 자연어 Refine Bar (L4-B)
결과 화면 하단 sticky bar — 항상 노출되는 자연어 보정 진입점.

```
┌─────────────────────────────────────────────────────────────┐
│ 이 결과를 어떻게 다듬을까요?                                  │
│ [textarea —— "더 캐주얼하게 30대 남성 톤으로"]                │
│ 적용할 항목: ☑ 상품명  ☑ 카피  ☑ 설명     [↻ 다듬기]          │
└─────────────────────────────────────────────────────────────┘
```

- 여러 섹션에 동시 적용 (체크박스 선택)
- 잠긴 섹션은 자동 제외
- 백엔드 변경 없음 — 기존 per-section regenerate 핸들러를 병렬 호출

### 14.2 상세페이지 LLM 자동 조립 (G5 진정 구현)
현재 노션 에디터는 `buildDefaultSections` 헬퍼로 정적 구성. Phase 3 에서:
- 신규 라우트 `/api/generate/detail-page-sections` (Edge Runtime)
- 입력: analysis + 결과 (상품명·카피·설명·키워드)
- 출력: 셀러 의도에 맞춘 `DetailSection[]` (LLM 이 섹션 종류·순서·텍스트까지 결정)
- AI SDK Router 의 `detail_page` task 사용
- 클라이언트: 노션 에디터에 [✨ AI 로 자동 구성] 버튼 → 호출 → setSections

### 14.3 트렌드 키워드 실연동
현재 `trend-fetcher.ts` 는 정적 fallback. Phase 3:
- 네이버 DataLab API 실연동 (`NAVER_DATALAB_CLIENT_ID` + `_SECRET`)
- 키 미설정 시 fallback (현재 동작 유지)
- Google Trends 는 비공식 API 라 Edge 호환 어려움 → 추후 별도 백엔드 워커

### 14.4 썸네일 영역 마스크 편집 (G4-7)
**Phase 3 범위**: 사용자가 썸네일 위에 사각형 영역 선택 → 그 영역의 자연어 위치 설명을 추출 → prompt 에 주입.

- `ThumbnailMaskEditor` 컴포넌트 — Canvas 기반 사각형 드래그
- 선택 영역 좌표 → 9-grid 위치 라벨 ("우상단", "중앙", "하단") 자동 변환
- `/api/generate/thumbnail` 의 `refinement` 필드에 위치 + 사용자 지시 결합 전달

**향후(Phase 4)**: Nano Banana 2 의 정식 inpainting API 도입 시 mask PNG 직접 전송. 현재 SDK 가 mask 파라미터 미지원이라 prompt 기반 우회.

---

## 12. Phase 2 컴포넌트 위치 매핑

| 컴포넌트 | 경로 | Layer |
|---------|------|-------|
| `VariantsTray` | `src/components/variants-tray/` | L5 |
| `LockToggle` | (인라인, SectionHeader 의 prop) | L5-B |
| `ThumbnailPinControls` | `src/components/thumbnail-grid/` 내부 확장 | L6 |
| `ResolutionPicker` | `src/components/resolution-picker/` (또는 IntentForm 내부) | L6 |
| `TrendKeywordsEditor` | `AnalysisReviewCard` 내부 별도 섹션 | L7 |
| `DetailPageEditor` | `src/components/detail-page-editor/` | L8 |
| `DetailPageEditor/{Hero,Features,Description,Keywords,Reviews,CTA,Text,Image}Block` | 같은 폴더 sub-component | L8 |

## 13. Phase 2 store 확장

```typescript
interface StudioStore {
  // ... Phase 1까지 ...

  // L5 Variants
  variants: {
    naming: NamingResult[]
    tagline: TaglineResult[]
    description: DescriptionResult[]
  }
  activeIndex: { naming: number; tagline: number; description: number }
  addVariant<K>(kind: K, result: any, refinement?: string): void
  selectVariant<K>(kind: K, index: number): void

  // L5-B Locks
  locks: { naming: boolean; tagline: boolean; description: boolean }
  toggleLock(kind: 'naming' | 'tagline' | 'description'): void

  // L6 Thumbnail Pin
  pinnedAspectRatios: Set<string>
  togglePin(aspectRatio: string): void
  thumbnailResolution: '1K' | '2K' | '4K'
  setThumbnailResolution(r: '1K' | '2K' | '4K'): void

  // L7 Trend Keywords
  trendKeywords: string[]
  setTrendKeywords(items: string[]): void

  // L8 Detail Page Editor
  detailPageSections: DetailSection[] | null
  setDetailPageSections(sections: DetailSection[]): void
}
```
