-- Recreate usage_events with schema expected by billing page and thumbnail API.
-- The original table in 001 used (kind, cost, tokens_in, tokens_out);
-- application code uses (event_type, credits_used, project_id, metadata).

drop table if exists public.usage_events cascade;

create table public.usage_events (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users on delete cascade not null,
  project_id  uuid        references public.projects on delete set null,
  event_type  text        not null,
  credits_used integer    not null default 0,
  metadata    jsonb,
  created_at  timestamptz default now()
);

alter table public.usage_events enable row level security;

create policy "usage_events_select_own"
  on public.usage_events
  for select
  using (user_id = auth.uid());

create index on public.usage_events (user_id, created_at desc);
