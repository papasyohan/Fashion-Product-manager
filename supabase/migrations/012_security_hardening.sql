-- Migration 012: 보안 강화
--
-- SEC-03: 크레딧 TOCTOU Race Condition 방어 — 원자적 차감 RPC
-- SEC-09: app_settings RLS 정책 — is_admin() SECURITY DEFINER 함수 사용
-- SEC-14: v_admin_stats 뷰 — 일반 사용자 접근 차단 (service_role만 허용)

-- ─── SEC-14: v_admin_stats 권한 수정 ──────────────────────────────────────────
-- 기존: authenticated role 전체에게 SELECT 허용 → 모든 인증 사용자가 MRR·사용자수 조회 가능
-- 수정: authenticated 권한 회수, service_role(서버 Admin 전용)만 허용

REVOKE SELECT ON public.v_admin_stats FROM authenticated;
GRANT  SELECT ON public.v_admin_stats TO   service_role;

-- Admin 서버 API는 createAdminClient()(service_role)를 사용하므로 동작 유지.

-- ─── SEC-09: app_settings 쓰기 정책 — is_admin() 함수 사용 ──────────────────
-- 기존: EXISTS (SELECT 1 FROM user_profiles WHERE ...) → user_profiles RLS와 상호재귀 위험
-- 수정: SECURITY DEFINER 함수 is_admin()으로 교체 (008 마이그레이션과 동일 패턴)

DROP POLICY IF EXISTS "app_settings_write_admin" ON public.app_settings;

CREATE POLICY "app_settings_write_admin"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── SEC-03: 크레딧 원자 차감 RPC ─────────────────────────────────────────────
-- 기존 deduct_credits: GREATEST(credits_left - amount, 0) — 잔액 부족 시에도 무조건 실행
--   → checkCreditGuard(읽기) + deductCredits(쓰기) 사이에 Race Condition 발생 가능
--
-- 신규 deduct_credits_atomic:
--   credits_left >= amount 조건부 UPDATE → 행이 갱신된 경우만 true 반환
--   행이 갱신되지 않으면 false 반환 (크레딧 부족 또는 userId 없음)
--   → 동시 요청이 와도 DB 레벨에서 한 번만 차감 보장

CREATE OR REPLACE FUNCTION public.deduct_credits_atomic(
  p_user_id UUID,
  p_amount  INTEGER
)
RETURNS BOOLEAN   -- true = 차감 성공, false = 크레딧 부족
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_updated INTEGER;
BEGIN
  UPDATE public.user_profiles
  SET    credits_left = credits_left - p_amount,
         updated_at   = NOW()
  WHERE  id           = p_user_id
    AND  credits_left >= p_amount;   -- 잔액이 충분할 때만 차감

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  RETURN v_rows_updated > 0;
END;
$$;

COMMENT ON FUNCTION public.deduct_credits_atomic IS
  'SEC-03: 크레딧 TOCTOU 방어 — credits_left >= amount 조건부 원자 차감.
   true 반환 = 성공, false 반환 = 크레딧 부족 (롤백 불필요, 차감 자체가 실행되지 않음).';

-- authenticated role이 RPC 호출 가능하도록 (SECURITY DEFINER이므로 실행 권한만 필요)
GRANT EXECUTE ON FUNCTION public.deduct_credits_atomic TO authenticated;
