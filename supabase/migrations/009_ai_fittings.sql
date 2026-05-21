-- Migration 009: AI Fitting 기능 (Phase 4)
--
-- 사용자가 모델 사진을 업로드하면 Nano Banana 2 가 원본 제품을 그 모델에 입혀준
-- 합성 이미지를 생성. 결과는 ai_fittings 테이블에 저장.
--
-- 비즈니스 제약:
-- - studio_fitting operation = 5 크레딧 (썸네일 3 크레딧 대비 비쌈)
-- - Pro 플랜 이상만 사용 가능 (코드 측 credit-guard.ts 에서 강제)
-- - 모델 사진은 영구 보관 (사용자가 새로 올릴 때까지)

-- ─── AI Fitting 결과 테이블 ─────────────────────────────────────────────────
create table if not exists public.ai_fittings (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  /** 사용자가 업로드한 모델 사진 (Supabase Storage URL) — 재사용 가능 */
  model_image_url text,
  /** 생성된 합성 이미지 (Supabase Storage URL) */
  result_url      text not null,
  aspect_ratio    text,
  width           int,
  height          int,
  /** Phase 2 의 is_pinned 패턴 — 좋은 결과 유지 */
  is_pinned       boolean default false,
  /** 사용된 5계층 프롬프트 (디버깅용) */
  prompt          text,
  /** 사용자가 결과 페이지의 hero 이미지로 선택했는지 */
  is_hero_image   boolean default false,
  created_at      timestamptz not null default now()
);

create index if not exists idx_ai_fittings_project
  on public.ai_fittings(project_id, created_at desc);

create index if not exists idx_ai_fittings_hero
  on public.ai_fittings(project_id) where is_hero_image = true;

-- ─── RLS 정책 ──────────────────────────────────────────────────────────────
alter table public.ai_fittings enable row level security;

drop policy if exists "users read own ai_fittings" on public.ai_fittings;
create policy "users read own ai_fittings"
  on public.ai_fittings for select
  using (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

drop policy if exists "users insert own ai_fittings" on public.ai_fittings;
create policy "users insert own ai_fittings"
  on public.ai_fittings for insert
  with check (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

drop policy if exists "users update own ai_fittings" on public.ai_fittings;
create policy "users update own ai_fittings"
  on public.ai_fittings for update
  using (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

drop policy if exists "admin reads all ai_fittings" on public.ai_fittings;
create policy "admin reads all ai_fittings"
  on public.ai_fittings for select
  using (public.is_admin());

-- ─── 마지막 모델 사진 캐시 (재사용 위해 user_profiles 에 저장) ───────────────
-- 사용자가 모델을 다시 올릴 때까지 가장 최근 모델 URL 을 보존.
-- 같은 모델로 다른 상품에도 fitting 시도 시 즉시 재사용 가능.
alter table public.user_profiles
  add column if not exists last_model_image_url text;

comment on column public.user_profiles.last_model_image_url is
  'Phase 4 — 마지막 업로드한 AI Fitting 모델 사진 URL. 사용자가 새로 올릴 때까지 재사용 가능.';

-- ─── Storage 버킷 안내 ─────────────────────────────────────────────────────
-- 이 마이그레이션과 별도로 Supabase Dashboard 의 Storage 에서
-- 'ai-fittings' 버킷이 존재해야 합니다. (이미 'product-images' 등 다른 버킷 사용 중)
-- 정책: 인증된 사용자만 INSERT, 본인 파일만 SELECT.
--
-- Supabase Dashboard → Storage → Create bucket 'ai-fittings' (public read 권장)
-- RLS 정책은 Storage UI 에서 설정하거나 아래 SQL 추가:
--
-- Bucket 정책 예시 (Dashboard 적용 권장):
-- 1. INSERT: authenticated 만 가능
-- 2. SELECT: public (서명 URL 보호 불필요한 결과 이미지)
