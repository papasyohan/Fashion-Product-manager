-- Migration 006: add_credits RPC 함수
--
-- Toss 웹훅에서 크레딧 충전 팩 구매 완료 시 credits_left를 증가시키는 함수
-- deduct_credits (005)와 대칭 — 음수로 내려가지 않도록 floor는 없음 (증가만)

create or replace function public.add_credits(p_user_id uuid, p_amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_profiles
  set    credits_left = credits_left + p_amount,
         updated_at   = now()
  where  id = p_user_id;
end;
$$;
