# 다음 세션 시작 프롬프트

> 새 세션에서 아래 블록을 그대로 첫 메시지로 붙여넣으면, Claude 가 이전 컨텍스트를 빠르게 복원하고 이어서 작업합니다.

---

## 🔁 복원용 시작 프롬프트 (복사 → 새 세션에 붙여넣기)

```
프로젝트: ProductCraft AI (Korean fashion e-commerce SaaS)
경로: /Users/yohan/Documents/claude/Fashion Product Manager/productcraft-ai

이전 세션에서 Phase 4 (AI Fitting + History/Studio UI/UX 보완) 까지 완료하고
컨텍스트 한계로 분리되었습니다. 다음 3개 문서를 먼저 읽고 현재 상태를 파악하세요.

1. docs/SESSION_HANDOFF.md   ← 최우선. 결정/구현/미해결/다음 옵션 전체
2. docs/PHASE_4_COMPLETION.md ← Phase 4 상세 (D안 풀세트, 검증 결과)
3. CLAUDE.md (→ AGENTS.md)   ← Next.js 16 경고

읽은 후, 아래 순서로 진행해주세요.

A. 운영 상태 빠른 점검
   - git status, git log -5
   - 마지막 배포 커밋이 19f7095 (D안 풀세트) 인지 확인
   - 필요 시 vercel logs productcraft-ai 로 최근 에러 확인

B. 사용자(나)에게 다음 4가지 옵션 중 선택을 받으세요:
   ① AI Fitting 실 사용자 테스트 — 실제 모델 사진 업로드 + 결과 품질 검증
   ② Admin 페이지 점검 — /admin 대시보드 동작, 통계, 사용자 관리
   ③ 새 기능/개선 — fitting 결과 history 통합, 채널별 export, 운영자 분석 등
   ④ 운영 시작 + 피드백 수집 — 베타 사용자 공유, 피드백 채널 구축

C. 선택을 받으면 그 작업을 오토파일럿으로 진행하세요. 단,
   - 시크릿(API 키, 비밀번호) 절대 출력 금지
   - destructive git 명령(--force, --no-verify) 사용자 명시 요청 시에만
   - Next.js 16 코드 수정 전 node_modules/next/dist/docs/ 먼저 확인

운영 계정:
- yohan73@gmail.com  (admin)
- yohan@papascompany.co.kr  (admin)

먼저 위 3개 문서를 읽고, 현재 상태를 1단락으로 요약한 뒤
어떤 옵션을 진행할지 나에게 물어봐주세요.
```

---

## 💡 사용 팁

- 위 블록만 그대로 붙여넣으면 됩니다. **추가 설명 불필요.**
- Claude 가 SESSION_HANDOFF.md 를 먼저 읽으므로 D안·미해결사항·환경변수까지 자동 복원됩니다.
- 만약 새 세션에서 곧바로 특정 옵션 하나만 진행하고 싶다면, 위 프롬프트의 B 섹션을 다음과 같이 바꿔서 사용:

```
B. (옵션 선택 생략) 바로 [① AI Fitting 실 테스트] 진행
```

- 핵심 파일 단축 경로 (디버깅 시 빠른 진입용):
  - `src/app/api/generate/ai-fitting/route.ts`
  - `src/components/ai-fitting-panel/index.tsx`
  - `src/lib/credit-guard.ts`
  - `src/store/studio.ts`
  - `supabase/migrations/009_ai_fittings.sql`
