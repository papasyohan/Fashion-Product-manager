-- Sprint 4 버그 수정
--
-- 1) shares 테이블에 user_id 컬럼 추가
--    - /api/share 라우트가 user_id를 insert 하지만 컬럼이 없어 DB 오류 발생
--    - 기존 rows 가 있을 수 있으므로 nullable FK로 추가
--
-- 2) deduct_credits RPC 함수 생성
--    - credit-guard.ts의 deductCredits()가 supabase.rpc('deduct_credits')를 호출하지만
--      함수가 DB에 없어 크레딧 차감이 무시되던 문제 해결
--    - 크레딧이 0 아래로 내려가지 않도록 GREATEST 적용

-- ─── 1. shares.user_id ───────────────────────────────────────────────────────

alter table public.shares
  add column if not exists user_id uuid references auth.users on delete set null;

create index if not exists shares_user_id_idx on public.shares (user_id);

-- ─── 2. deduct_credits RPC ───────────────────────────────────────────────────

create or replace function public.deduct_credits(p_user_id uuid, p_amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_profiles
  set    credits_left = greatest(credits_left - p_amount, 0),
         updated_at   = now()
  where  id = p_user_id;
end;
$$;
