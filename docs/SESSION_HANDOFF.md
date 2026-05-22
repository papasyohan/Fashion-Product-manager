# 세션 핸드오프 — Phase 4 완료 시점 (2026-05-21 기준)

> 이 문서는 컨텍스트 한계로 세션이 분리될 때, 다음 세션이 **개발 히스토리·결정사항·다음 작업**을 잃지 않고 이어가기 위한 핸드오프 문서입니다.
> 새 세션 시작 시: `docs/SESSION_HANDOFF.md` + `docs/PHASE_4_COMPLETION.md` + `CLAUDE.md` 를 먼저 읽으세요.

---

## 1. 프로젝트 식별

- **이름**: ProductCraft AI (Korean fashion e-commerce SaaS)
- **루트**: `/Users/yohan/Documents/claude/Fashion Product Manager/productcraft-ai`
- **레포**: GitHub (main 브랜치, Vercel 자동 배포)
- **운영자**: yohan73@gmail.com, yohan@papascompany.co.kr (둘 다 admin)
- **스택**: Next.js 16 (App Router) · Vercel AI SDK v6 · Supabase · pnpm v10
- **AI 라우팅**: Claude(주) + Gemini(보조 · Fallback) — 하이브리드
- **이미지**: Nano Banana 2 (`gemini-3.1-flash-image-preview`) — multi-reference

> ⚠️ Next.js 16 은 학습 데이터의 Next.js 와 API/규약이 다르다. 코드 수정 전 `node_modules/next/dist/docs/` 를 먼저 확인할 것. (`AGENTS.md` 지시)

---

## 2. 완료된 단계 요약

### Phase 1 — UX Customization Loop 기본
- 의도 입력 → 분석 편집 → 인라인 편집 → 부분 재생성

### Phase 2 — Variants / Lock / Pin / Notion-style 에디터
- 결과 카드 4 variants, 잠금/고정 메커니즘

### Phase 3 — 자연어 보정 + LLM 조립 + 트렌드 실연동 + 영역 마스크 + Admin
- 네이버 DataLab API (`NAVER_DATALAB_CLIENT_ID/SECRET`) 적용
- Admin 대시보드 (`/admin`), 권한은 `user_profiles.role='admin'`
- RLS 무한재귀 fix: `public.is_admin()` SECURITY DEFINER 함수
- 패션 큐레이션 스킬 도입 (`.claude/skills`)

### Phase 4 — AI Fitting + 히스토리 흐름 UI/UX (현재 위치)
- **AI Fitting**: 사용자 모델 사진 업로드 → 제품과 합성 (multi-reference)
- 동적 크레딧: 1장=2 / 2장=4 / 3장=5 / 4장+=6 (`aiFittingCredits()`)
- Pro+ 플랜 게이팅 (`OPERATION_PLAN_GATE`)
- 체크박스 UI + 채널 힌트 (1:1·4:5·9:16)
- Storage `ai-fittings/` 버킷 + `user_profiles.last_model_image_url` 재사용
- 히스토리 행 전체 클릭, hover CTA "결과 보기 →"
- result-card 섹션 재번호: 04 AI Fitting / 05 썸네일 / 06 상세페이지 / 07 공유
- 상세페이지 hero 구조: title → tagline → image
- SSE 에러 전파 수정 (sse-client.ts onEvent throw 보존)
- AI 라우터 retriable 패턴 확장 (`no object generated|could not parse`)
- 스키마 완화 (Naming/Tagline/Description)

### 운영 안정화 작업
- Anthropic 크레딧 충전 ($5) 후 하이브리드 복귀
- pnpm 9→10 글로벌 업그레이드 (store version 충돌 해결)
- `pnpm-workspace.yaml` 에 `packages: [.]` 추가

---

## 3. 핵심 코드 위치 (Phase 4 기준)

```
src/
  app/
    (app)/
      studio/page.tsx                  # AI Fitting 핸들러, loading_history
      history/history-client.tsx       # row hover + CTA
    api/
      generate/
        ai-fitting/route.ts            # Node Runtime, maxDuration=90
        detail-page/route.ts           # hero 구조 변경
        pipeline/route.ts              # currentStep tracking, description fallback
  components/
    ai-fitting-panel/index.tsx         # 체크박스 + 채널 힌트 + 동적 라벨
    result-card/index.tsx              # 04~07 섹션
  lib/
    credit-guard.ts                    # aiFittingCredits(), OPERATION_PLAN_GATE
    prompts/image/ai-fitting.ts        # 5-layer prompt
    ai/
      image/nano-banana2-provider.ts   # slice(0, 5)
      sse-client.ts                    # onEvent throw 전파
      router.ts                        # isRetriableError 패턴
      types.ts                         # 완화된 스키마
  store/studio.ts                      # Phase 4 state

supabase/migrations/
  007_*.sql                            # Phase 3
  008_*.sql                            # admin role + RLS fix (is_admin SECURITY DEFINER)
  009_ai_fittings.sql                  # Phase 4 — ai_fittings 테이블

.claude/skills/                        # 패션 큐레이션 스킬
docs/
  ADMIN.md                             # admin 운영 가이드
  AI_ARCHITECTURE.md                   # AI 라우팅 전체 구조
  UX_CUSTOMIZATION.md                  # Phase 1-4 UX 6-레이어 모델
  상품설명 학습데이터.md
```

---

## 4. 환경 변수 체크리스트 (운영)

`.env.local` 과 **Vercel env** 모두 동일해야 함:

| 키 | 용도 | 상태 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude (주) | ✅ 충전됨 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini + Nano Banana 2 | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Storage 업로드, admin | ✅ |
| `NAVER_DATALAB_CLIENT_ID` | 트렌드 | ✅ `5fUiMTzr_RUWmp3TDduA` |
| `NAVER_DATALAB_CLIENT_SECRET` | 트렌드 | ✅ (Vercel 에만 평문) |
| `DEV_BYPASS_CREDITS` | 로컬 테스트 우회 | 운영에선 unset |

---

## 5. DB 마이그레이션 적용 상태

| Migration | 내용 | 상태 |
|---|---|---|
| 007 | Phase 3 변형/Lock/Pin | ✅ 적용됨 |
| 008 | admin role + is_admin() SECURITY DEFINER | ✅ 적용 (RLS 재귀 fix 포함) |
| 009 | ai_fittings 테이블 + user_profiles.last_model_image_url | ✅ 적용 |
| Storage | `ai-fittings/` 버킷 | ✅ 생성됨 |

---

## 6. 알려진 미해결/관찰 사항

1. **AI Fitting 실 사용자 테스트 미완료**
   브라우저 자동화로 file picker 한계 — 사용자가 수동으로 실제 모델 사진 올려 end-to-end 테스트 필요.

2. **AI API 잔액 모니터링**
   Anthropic / Google 둘 다 한도 도달 시 fallback 차단됨. `/api/generate/pipeline` 에러 메시지가 충전 링크를 노출하지만 운영 알람은 미구축.

3. **Storage 버킷 권한**
   `ai-fittings/` 는 public read. 향후 signed URL 또는 RLS 로 좁힐지 검토 필요.

4. **fitting 결과 history 통합**
   현재 ai_fittings 는 별도 테이블로만 존재. 히스토리 페이지에서 fitting 결과를 함께 보여줄지 결정 필요.

---

## 7. 다음 세션에서 사용자가 선택할 옵션

직전 세션 마지막에 제시했고, 사용자가 선택 전 컴팩션을 요청함:

1. **① AI Fitting 실 사용자 테스트** — 실제 모델 사진 업로드 + 결과 검증
2. **② Admin 페이지 점검** — `/admin` 대시보드 동작 검증, 통계 카드, 사용자 관리
3. **③ 새 기능/개선** — 예: fitting 결과 history 통합, 채널별 자동 export, 운영자 분석
4. **④ 운영 시작 + 피드백 수집** — 베타 사용자에게 공유, 피드백 채널 구축

---

## 8. 보안/운영 원칙 (전역)

- **시크릿 절대 출력 금지** — API 키, 비밀번호, JWT 등은 위치만 기록
- **CLAUDE.local.md** 는 항상 `.gitignore` 포함
- **fail2ban 회피**: VPS 접속 시 사용자명 추측 다중 시도 금지
- **destructive git 금지**: `--no-verify`, `--force` 등은 사용자 명시 요청 시에만
- **Phase 4 결정 사항 D안** 변경 금지 — 체크박스 + 채널 힌트 + 동적 크레딧

---

## 9. 빠른 운영 명령

```bash
# 로컬 개발
cd "/Users/yohan/Documents/claude/Fashion Product Manager/productcraft-ai"
pnpm dev

# Vercel 상태
vercel projects ls
vercel logs productcraft-ai

# Supabase 마이그레이션 추가 시 — UI 콘솔에서 SQL 직접 실행
# (CLI 미연동 — 사용자가 콘솔에서 적용)
```

---

마지막 커밋: `19f7095 feat(ai-fitting): D안 풀세트 — 체크박스 + 채널 힌트 + 동적 크레딧`
