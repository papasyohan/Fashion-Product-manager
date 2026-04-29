-- Sprint 3 — Toss 웹훅이 참조하는 컬럼 보완
-- 001 에서 누락된 subscriptions.status / current_period_* / toss_order_id 와
-- user_profiles.updated_at 을 추가한다.

-- ─── user_profiles: updated_at ───────────────────────────────────────────────
alter table public.user_profiles
  add column if not exists updated_at timestamptz default now();

-- ─── subscriptions: 상태/기간/Toss 주문 ID ──────────────────────────────────
alter table public.subscriptions
  add column if not exists status text not null default 'active'
    check (status in ('active', 'cancelled', 'past_due')),
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end   timestamptz,
  add column if not exists toss_order_id        text,
  add column if not exists updated_at           timestamptz default now();

create index if not exists subscriptions_user_status_idx
  on public.subscriptions (user_id, status);
