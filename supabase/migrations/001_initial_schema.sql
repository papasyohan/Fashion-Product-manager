-- users 확장 (auth.users 기반)
create table public.user_profiles (
  id uuid references auth.users on delete cascade primary key,
  plan text not null default 'free' check (plan in ('free','starter','pro','business')),
  credits_left integer not null default 3,
  created_at timestamptz default now()
);

-- projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  mode text not null check (mode in ('quick','studio')),
  product_image_url text,
  status text not null default 'pending' check (status in ('pending','processing','done','failed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- generations
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects on delete cascade not null,
  type text not null check (type in ('analyze','naming','tagline','description','thumbnail')),
  payload jsonb,
  created_at timestamptz default now()
);

-- thumbnails
create table public.thumbnails (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects on delete cascade not null,
  url text not null,
  width integer,
  height integer,
  aspect_ratio text,
  is_primary boolean default false,
  nano_banana_request_id text,
  created_at timestamptz default now()
);

-- shares
create table public.shares (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects on delete cascade not null,
  channel text not null check (channel in ('sms','kakao','link')),
  target text,
  short_url text,
  created_at timestamptz default now()
);

-- subscriptions
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null unique,
  toss_customer_key text,
  plan text not null default 'free',
  renew_at timestamptz,
  created_at timestamptz default now()
);

-- usage_events
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  kind text not null,
  cost numeric(10,4) default 0,
  tokens_in integer default 0,
  tokens_out integer default 0,
  created_at timestamptz default now()
);

-- RLS 활성화
alter table public.user_profiles enable row level security;
alter table public.projects enable row level security;
alter table public.generations enable row level security;
alter table public.thumbnails enable row level security;
alter table public.shares enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_events enable row level security;

-- RLS 정책 (user_id = auth.uid() 원칙)
create policy "users_own" on public.user_profiles for all using (id = auth.uid());
create policy "projects_own" on public.projects for all using (user_id = auth.uid());
create policy "generations_own" on public.generations for all using (
  project_id in (select id from public.projects where user_id = auth.uid())
);
create policy "thumbnails_own" on public.thumbnails for all using (
  project_id in (select id from public.projects where user_id = auth.uid())
);
create policy "shares_own" on public.shares for all using (
  project_id in (select id from public.projects where user_id = auth.uid())
);
create policy "subscriptions_own" on public.subscriptions for all using (user_id = auth.uid());
create policy "usage_own" on public.usage_events for all using (user_id = auth.uid());

-- 인덱스
create index on public.projects(user_id, created_at desc);
create index on public.generations(project_id);
create index on public.thumbnails(project_id);
