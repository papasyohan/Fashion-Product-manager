-- Migration 007: 사용자 의도 + 변형 트리 + 핀
--
-- v1.1 UX Customization Loop Phase 1 의 데이터 모델.
-- L1 (Pre-Generation Intent), L2 (Analysis Override), L3 (Inline Edit),
-- L4 (Per-section Regenerate), L6 (Thumbnail Pin) 지원.

-- ─── projects: 사용자 의도 ─────────────────────────────────────────────────
-- 업로드 직후 IntentForm 에서 입력한 톤/타깃/채널/메모 저장.
-- 형식: { tone, audience, channel, memo }
alter table public.projects
  add column if not exists user_intent jsonb default '{}'::jsonb;

-- ─── generations: 편집 흔적 + 변형 트리 + 보정 지시 ─────────────────────────
-- user_edited: 사용자가 인라인 편집한 결과인지
-- parent_id: 재생성 변형 트리 추적 (Phase 2 Variants Tray 대비)
-- refinement_prompt: 재생성 시 사용된 사용자 보정 지시
-- locked: Phase 2 lock & iterate 기능 대비
alter table public.generations
  add column if not exists user_edited boolean default false,
  add column if not exists parent_id uuid references public.generations(id) on delete set null,
  add column if not exists refinement_prompt text,
  add column if not exists locked boolean default false;

create index if not exists idx_generations_parent
  on public.generations(parent_id)
  where parent_id is not null;

-- ─── thumbnails: 핀 상태 (Phase 2 활용) ─────────────────────────────────────
alter table public.thumbnails
  add column if not exists is_pinned boolean default false;

-- ─── usage_events: 새 이벤트 종류 (kind 컬럼은 text 라 ALTER 불필요) ───────
-- 추가될 kind 값:
--   intent_used         — IntentForm 에서 최소 1개 chip 선택
--   analysis_edited     — AnalysisReviewCard 에서 필드 수정
--   text_edited         — EditableText 로 결과 직접 편집
--   partial_regen       — RegenerateMenu 프리셋 사용
--   refinement_used     — RegenerateMenu 자유 입력 사용
-- (별도 ALTER 없음 — 단순히 새 kind 값을 INSERT 만 하면 됨)

-- ─── projects 의 updated_at 트리거가 user_intent 변경 시에도 발동되는지 확인 ─
-- (기존 트리거가 있으면 그대로 동작, 없으면 추가)
-- 004 마이그레이션에서 updated_at 갱신 트리거가 이미 있으므로 별도 작업 불필요.

comment on column public.projects.user_intent is
  'User Intent (L1) — { tone, audience, channel, memo }';
comment on column public.generations.user_edited is
  'L3 Inline Edit — true if user manually edited the generated text';
comment on column public.generations.parent_id is
  'L4/L5 Variants — links a regenerated output to its predecessor';
comment on column public.generations.refinement_prompt is
  'L4 — the user refinement string used to regenerate this output';
comment on column public.generations.locked is
  'L5 — when true, this generation is preserved during cascade regeneration';
comment on column public.thumbnails.is_pinned is
  'L6 — user-pinned thumbnail, preserved during re-roll';
