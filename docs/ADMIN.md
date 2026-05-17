# Admin 시스템

ProductCraft AI 의 관리자 대시보드 설계 및 운영 가이드.

---

## 1. 권한 모델

```sql
ALTER TABLE user_profiles
  ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));
```

- **user**: 일반 셀러 (기본)
- **admin**: 운영자 — 전 유저 데이터 열람·수정 가능

### admin 으로 승격하기
Supabase Dashboard SQL Editor 에서:
```sql
UPDATE user_profiles SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com');
```

---

## 2. 라우트 보호 (proxy.ts)

```typescript
// /admin/* 진입 시 role = 'admin' 확인
if (pathname.startsWith('/admin')) {
  const { data } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') {
    return NextResponse.redirect(new URL('/studio', request.url))
  }
}
```

- 비-admin 이 `/admin` 직접 접근 시 `/studio` 로 리다이렉트 (404 대신 자연스러운 폴백)
- admin 라우트 내부의 모든 데이터 조회는 `SUPABASE_SERVICE_ROLE_KEY` (createAdminClient) 사용 — RLS 우회

---

## 3. 기능 범위 (MVP)

### 3.1 대시보드 (`/admin`)
- 핵심 지표 카드 6개:
  - 총 가입자 수 (지난 7일 증감)
  - 활성 셀러 (지난 7일 1회 이상 생성)
  - 누적 생성 건수 (지난 7일)
  - MRR (Toss 구독 합계)
  - 무료/Starter/Pro/Business 플랜 분포
  - 평균 세션당 재생성 횟수 (UX 지표)
- 최근 생성 이벤트 20건 (스크롤)
- 최근 가입 유저 10명

### 3.2 유저 관리 (`/admin/users`)
- 검색 (이메일 부분 일치)
- 정렬: 가입일 / 마지막 사용일 / 크레딧 잔액
- 필터: plan / role
- 각 유저 행에서 inline 액션:
  - **플랜 변경** — 드롭다운으로 free/starter/pro/business 선택
  - **크레딧 조정** — +/- 입력 → `add_credits` 또는 `deduct_credits` RPC 호출
  - **계정 정지** (soft delete) — `banned_at` timestamp 추가 (008 마이그레이션)

### 3.3 생성 히스토리 (`/admin/projects`)
- 모든 프로젝트 열람 (필터: user_id, mode, status, 날짜)
- 클릭 시 상세 generations 보기
- 의심스러운 콘텐츠 (금칙어, 신고) 강제 삭제

### 3.4 결제 내역 (`/admin/billing`)
- usage_events 의 credit_purchased / plan_upgraded 이벤트 목록
- Toss 거래 ID 와 매칭 가능한 view

---

## 4. 데이터 모델 변경 (Migration 008)

```sql
-- 008_user_role_and_admin.sql

-- 권한 컬럼
alter table public.user_profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

-- 계정 정지 (soft delete)
alter table public.user_profiles
  add column if not exists banned_at timestamptz;

-- RLS: admin 은 모든 user_profiles 읽기 가능
create policy "admin reads all profiles"
  on public.user_profiles for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS: admin 은 모든 projects 읽기 가능
create policy "admin reads all projects"
  on public.projects for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 사용량 통계 view (admin 대시보드용)
create or replace view public.v_admin_stats as
select
  (select count(*) from public.user_profiles where banned_at is null) as total_users,
  (select count(*) from public.user_profiles where created_at > now() - interval '7 days') as new_users_7d,
  (select count(distinct user_id) from public.usage_events where created_at > now() - interval '7 days') as active_users_7d,
  (select count(*) from public.usage_events where event_type in ('quick_generated', 'studio_generated') and created_at > now() - interval '7 days') as generations_7d,
  (select coalesce(sum(case when plan = 'starter' then 19900 when plan = 'pro' then 49900 when plan = 'business' then 149000 else 0 end), 0) from public.user_profiles where banned_at is null) as mrr;

comment on column public.user_profiles.role is 'Authorization role: user (default) | admin';
comment on column public.user_profiles.banned_at is 'Soft delete timestamp — null=active';
```

---

## 5. 컴포넌트 매핑

| 컴포넌트 | 경로 | 역할 |
|---------|------|------|
| `AdminGuard` | `src/lib/auth/admin-guard.ts` | server-side admin role 확인 헬퍼 |
| `AdminLayout` | `src/app/(admin)/layout.tsx` | 좌측 nav, 상단 admin 표시 |
| `AdminDashboard` | `src/app/(admin)/admin/page.tsx` | 핵심 지표 카드 그리드 |
| `AdminUsers` | `src/app/(admin)/admin/users/page.tsx` | 유저 목록 + 검색 |
| `UserRow` | `src/components/admin/user-row.tsx` | 인라인 액션 (플랜/크레딧/정지) |
| `StatCard` | `src/components/admin/stat-card.tsx` | 지표 카드 |

---

## 6. 보안 체크리스트

- [ ] `SUPABASE_SERVICE_ROLE_KEY` 는 Vercel Production 에만 존재 (preview/development X)
- [ ] admin API 호출은 **반드시 `createAdminClient` 경유** (RLS 우회) — but 호출 직전 role 재검증
- [ ] 모든 admin route 는 server component / route handler — 클라이언트 컴포넌트에 service role key 노출 금지
- [ ] admin 액션 (플랜 변경 / 크레딧 조정 / 정지) 은 **감사 로그** (audit_log 테이블) 에 기록
- [ ] 감사 로그 view 도 admin 만 조회 가능 (RLS)
