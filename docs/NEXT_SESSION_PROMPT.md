# 다음 세션 시작 프롬프트

> 새 세션에서 아래 블록을 그대로 첫 메시지로 붙여넣으면, Claude가 이전 컨텍스트를 빠르게 복원하고 이어서 작업합니다.

---

## 🔁 복원용 시작 프롬프트 (복사 → 새 세션에 붙여넣기)

```
프로젝트: ProductCraft AI (Korean fashion e-commerce SaaS)
경로: /Users/yohan/Documents/claude/Fashion Product Manager/productcraft-ai

이전 세션에서 보안 강화(취약점 11건 + migration 011/012), Core Web Vitals 개선,
이미지/쿼리/렌더링 추가 최적화, 패션 큐레이션 스킬 강화(소재 필수화 + 포인트 키워드)까지
완료했습니다. 다음 문서를 먼저 읽고 현재 상태를 파악하세요.

1. docs/SESSION_HANDOFF.md   ← 최우선. 완료 작업/코드 위치/미해결/원칙 전체 (2026-06-13 기준)
2. CLAUDE.md (→ AGENTS.md)   ← Next.js 16 은 학습데이터와 다름, 수정 전 node_modules/next/dist/docs 확인
3. docs/PHASE_4_COMPLETION.md ← AI Fitting 상세 (필요 시)

읽은 후, 아래 순서로 진행해주세요.

A. 운영 상태 빠른 점검
   - git status, git log -5  (마지막 커밋 2905b04 perf 인지 확인)
   - npx tsc --noEmit && npx eslint src  (오류 0 유지 확인)
   - 배포는 git push → Vercel 자동 배포. (vercel CLI 토큰은 만료 상태 — 필요 시 vercel login 재인증)

B. 나에게 다음 옵션 중 선택을 받으세요 (SESSION_HANDOFF 6번 미해결 항목 기반):
   ① 포인트 키워드 UI 렌더링 — pointKeywords가 store까지만 저장됨. result-card 또는
      상세페이지 hero 하단에 태그 칩 UI 추가 (데이터는 이미 흐름, 표시만 구현)
   ② AI Fitting 실 사용자 E2E 테스트 — 실제 모델 사진 업로드 + 결과 품질 검증
   ③ fitting 결과 history 통합 — ai_fittings 결과를 히스토리 페이지에 함께 노출
   ④ 운영 강화 — AI API 잔액 모니터링 알람, ai-fittings signed URL 전환, 분석 대시보드
   ⑤ 새 기능 / 그 외 (내가 직접 지정)

C. 선택을 받으면 그 작업을 진행하세요. 단:
   - 시크릿(API 키·비밀번호) 절대 출력 금지
   - destructive git(--force, --no-verify)은 내가 명시 요청 시에만
   - .claude/ 는 gitignore 대상 → 스킬(SKILL.md) 수정 시 src/lib/prompts/fashion-curation-style.ts 도 함께 수정
   - Next.js 16 코드 수정 전 node_modules/next/dist/docs/ 먼저 확인
   - Supabase 마이그레이션은 CLI 미연동 → 내가 콘솔 SQL Editor에서 직접 적용

운영 계정: yohan73@gmail.com (admin) · yohan@papascompany.co.kr (admin)

먼저 위 문서를 읽고 현재 상태를 1단락으로 요약한 뒤, 어떤 옵션을 진행할지 물어봐주세요.
```

---

## 💡 사용 팁

- 위 블록만 그대로 붙여넣으면 됩니다. 추가 설명 불필요.
- 특정 옵션 하나만 바로 진행하고 싶으면 B 섹션을 이렇게 교체:
  ```
  B. (옵션 선택 생략) 바로 [① 포인트 키워드 UI 렌더링] 진행
  ```

- **핵심 파일 단축 경로** (빠른 진입용):
  - 포인트 키워드 데이터: `src/store/studio.ts`(GenerationResult), `src/app/(app)/studio/page.tsx`(pointKeywordsBuffer)
  - 표시 후보 위치: `src/components/result-card/index.tsx`, `src/components/detail-page-editor/index.tsx`
  - 스킬 런타임: `src/lib/prompts/fashion-curation-style.ts` (`POINT_KEYWORDS_GUIDE`)
  - 스킬 원본: `.claude/skills/fashion-curation-copy/SKILL.md`
  - 보안 모듈: `src/lib/security.ts`
  - AI Fitting: `src/app/api/generate/ai-fitting/route.ts`, `src/components/ai-fitting-panel/index.tsx`
