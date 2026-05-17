-- Migration 008: 관리자 권한 시스템
--
-- 운영자(admin) 권한 부여로 유저·생성·결제 데이터를 운영팀이 관리할 수 있게 한다.
-- 적용 후 본인 계정을 admin 으로 승격하려면:
--   UPDATE user_profiles SET role = 'admin'
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL');

-- ─── 권한 컬럼 ──────────────────────────────────────────────────────────────
alter table public.user_profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

comment on column public.user_profiles.role is
  'Authorization role: user (default) | admin — admin can view/edit all data';

-- ─── 계정 정지 (soft delete) ────────────────────────────────────────────────
alter table public.user_profiles
  add column if not exists banned_at timestamptz;

comment on column public.user_profiles.banned_at is
  'Soft delete — null=active, timestamp=banned (login 차단 / admin 만 복구 가능)';

-- ─── 인덱스 ─────────────────────────────────────────────────────────────────
create index if not exists idx_user_profiles_role on public.user_profiles(role)
  where role = 'admin';
create index if not exists idx_user_profiles_banned on public.user_profiles(banned_at)
  where banned_at is not null;

-- ─── RLS 정책 — admin 은 모든 데이터 조회 가능 ──────────────────────────────
-- 기존 RLS 정책은 owner-only 였으므로 admin 우회 정책을 추가한다.

drop policy if exists "admin reads all profiles" on public.user_profiles;
create policy "admin reads all profiles"
  on public.user_profiles for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "admin updates all profiles" on public.user_profiles;
create policy "admin updates all profiles"
  on public.user_profiles for update
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "admin reads all projects" on public.projects;
create policy "admin reads all projects"
  on public.projects for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "admin reads all usage_events" on public.usage_events;
create policy "admin reads all usage_events"
  on public.usage_events for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ─── 감사 로그 테이블 ───────────────────────────────────────────────────────
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid not null references auth.users(id),
  action      text not null,                     -- 'plan_changed' | 'credits_adjusted' | 'banned' | 'unbanned'
  target_id   uuid,                              -- 대상 유저 id (보통 user_profiles.id)
  payload     jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_log_target on public.audit_log(target_id, created_at desc);
create index if not exists idx_audit_log_actor  on public.audit_log(actor_id, created_at desc);

alter table public.audit_log enable row level security;

drop policy if exists "admin reads audit_log" on public.audit_log;
create policy "admin reads audit_log"
  on public.audit_log for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "admin inserts audit_log" on public.audit_log;
create policy "admin inserts audit_log"
  on public.audit_log for insert
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ─── 운영 대시보드용 통계 view ──────────────────────────────────────────────
create or replace view public.v_admin_stats as
select
  (select count(*) from public.user_profiles where banned_at is null)
    as total_users,
  (select count(*) from public.user_profiles where created_at > now() - interval '7 days')
    as new_users_7d,
  (select count(distinct user_id) from public.usage_events where created_at > now() - interval '7 days')
    as active_users_7d,
  (select count(*) from public.usage_events
   where event_type in ('quick_generated', 'studio_generated')
     and created_at > now() - interval '7 days')
    as generations_7d,
  (select coalesce(
      sum(case
        when plan = 'starter'  then 19900
        when plan = 'pro'      then 49900
        when plan = 'business' then 149000
        else 0
      end), 0)
   from public.user_profiles where banned_at is null)
    as mrr,
  (select count(*) from public.user_profiles where plan = 'free'     and banned_at is null) as free_users,
  (select count(*) from public.user_profiles where plan = 'starter'  and banned_at is null) as starter_users,
  (select count(*) from public.user_profiles where plan = 'pro'      and banned_at is null) as pro_users,
  (select count(*) from public.user_profiles where plan = 'business' and banned_at is null) as business_users;

grant select on public.v_admin_stats to authenticated;
