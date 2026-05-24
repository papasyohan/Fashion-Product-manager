-- ─── 010_app_settings.sql ────────────────────────────────────────────────────
-- 앱 전역 설정 키-값 테이블 (Admin 전용 쓰기)
-- 현재 사용 키:
--   plan_resolution  — 플랜별 기본 이미지 해상도 {"free":"1K","starter":"2K","pro":"2K","business":"4K"}
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS 활성화
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자 전체 읽기 허용 (API 라우트가 user 세션으로 읽을 경우 대비)
CREATE POLICY "app_settings_select_authenticated"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Admin 역할만 INSERT/UPDATE/DELETE
CREATE POLICY "app_settings_write_admin"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 기본값 삽입
INSERT INTO public.app_settings (key, value)
VALUES (
  'plan_resolution',
  '{"free":"1K","starter":"2K","pro":"2K","business":"4K"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.app_settings IS '앱 전역 설정 (Admin UI로 관리)';
COMMENT ON COLUMN public.app_settings.key IS '설정 키 (예: plan_resolution)';
COMMENT ON COLUMN public.app_settings.value IS 'JSONB 값';
