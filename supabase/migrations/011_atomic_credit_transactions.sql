-- Migration 011: 크레딧 원자 트랜잭션 RPC (BUG-01 수정)
--
-- 이미지 생성 결과 DB 기록 + usage_events + 크레딧 차감을
-- 단일 PostgreSQL 트랜잭션으로 처리 → 부분 성공/실패 불가.
--
-- 수정 전 문제:
--   1. thumbnails/ai_fittings INSERT
--   2. usage_events INSERT          ← 각각 별도 RPC/쿼리
--   3. deduct_credits RPC           ← 어느 하나 실패 시 나머지는 커밋됨
--
-- 수정 후:
--   record_thumbnail_generation / record_ai_fitting_generation 호출 한 번으로
--   세 작업이 동일 트랜잭션 내에서 실행 → 실패 시 전부 롤백.

-- ─── 썸네일 테이블 보강 ──────────────────────────────────────────────────────
-- thumbnail/route.ts 에서 resolution, prompt 컬럼을 insert 하는데,
-- 001_initial_schema.sql 에 해당 컬럼이 없으므로 여기서 추가.
ALTER TABLE public.thumbnails
  ADD COLUMN IF NOT EXISTS resolution TEXT,
  ADD COLUMN IF NOT EXISTS prompt     TEXT;

-- ─── RPC: record_thumbnail_generation ────────────────────────────────────────
--
-- 파라미터:
--   p_user_id    : 요청한 사용자 UUID
--   p_project_id : 프로젝트 UUID
--   p_thumbnails : [{url, width, height, aspect_ratio, resolution, prompt}] JSONB 배열
--   p_credits    : 차감할 크레딧 수
--   p_metadata   : usage_events.metadata 에 넣을 임의 JSON
--
-- 반환:
--   {records: [{id, url, width, height, aspect_ratio}]} — 삽입된 레코드

CREATE OR REPLACE FUNCTION public.record_thumbnail_generation(
  p_user_id    UUID,
  p_project_id UUID,
  p_thumbnails JSONB,
  p_credits    INTEGER,
  p_metadata   JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thumb     JSONB;
  v_records   JSONB := '[]'::JSONB;
  v_id        UUID;
  v_url       TEXT;
  v_width     INTEGER;
  v_height    INTEGER;
  v_ar        TEXT;
BEGIN
  -- 보안: 프로젝트가 실제로 이 사용자 소유인지 확인
  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Project not found or unauthorized: %', p_project_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 1. thumbnails 기록 (배열 순회)
  FOR v_thumb IN SELECT * FROM jsonb_array_elements(p_thumbnails)
  LOOP
    INSERT INTO public.thumbnails (
      project_id, url, width, height, aspect_ratio, resolution, prompt
    )
    VALUES (
      p_project_id,
      (v_thumb->>'url'),
      (v_thumb->>'width')::INTEGER,
      (v_thumb->>'height')::INTEGER,
      (v_thumb->>'aspect_ratio'),
      (v_thumb->>'resolution'),
      (v_thumb->>'prompt')
    )
    RETURNING id, url, width, height, aspect_ratio
    INTO v_id, v_url, v_width, v_height, v_ar;

    v_records := v_records || jsonb_build_array(
      jsonb_build_object(
        'id',           v_id,
        'url',          v_url,
        'width',        v_width,
        'height',       v_height,
        'aspect_ratio', v_ar
      )
    );
  END LOOP;

  -- 2. usage_events 기록
  INSERT INTO public.usage_events (user_id, project_id, event_type, credits_used, metadata)
  VALUES (p_user_id, p_project_id, 'thumbnail_generated', p_credits, p_metadata);

  -- 3. 크레딧 차감 (0 미만 방지)
  UPDATE public.user_profiles
  SET    credits_left = GREATEST(credits_left - p_credits, 0),
         updated_at   = NOW()
  WHERE  id = p_user_id;

  RETURN jsonb_build_object('records', v_records);
END;
$$;

COMMENT ON FUNCTION public.record_thumbnail_generation IS
  'BUG-01: thumbnails INSERT + usage_events INSERT + credits 차감을 단일 트랜잭션으로 처리';

-- ─── RPC: record_ai_fitting_generation ───────────────────────────────────────
--
-- 파라미터:
--   p_user_id    : 요청한 사용자 UUID
--   p_project_id : 프로젝트 UUID
--   p_fittings   : [{result_url, aspect_ratio, width, height, model_image_url, prompt}] JSONB 배열
--   p_credits    : 차감할 크레딧 수
--   p_metadata   : usage_events.metadata
--
-- 반환:
--   {records: [{id, result_url, aspect_ratio, width, height, model_image_url}]}

CREATE OR REPLACE FUNCTION public.record_ai_fitting_generation(
  p_user_id    UUID,
  p_project_id UUID,
  p_fittings   JSONB,
  p_credits    INTEGER,
  p_metadata   JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fitting       JSONB;
  v_records       JSONB := '[]'::JSONB;
  v_id            UUID;
  v_result_url    TEXT;
  v_ar            TEXT;
  v_width         INTEGER;
  v_height        INTEGER;
  v_model_url     TEXT;
BEGIN
  -- 보안: 프로젝트 소유권 확인
  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Project not found or unauthorized: %', p_project_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 1. ai_fittings 기록 (배열 순회)
  FOR v_fitting IN SELECT * FROM jsonb_array_elements(p_fittings)
  LOOP
    INSERT INTO public.ai_fittings (
      project_id, model_image_url, result_url, aspect_ratio, width, height, prompt
    )
    VALUES (
      p_project_id,
      (v_fitting->>'model_image_url'),
      (v_fitting->>'result_url'),
      (v_fitting->>'aspect_ratio'),
      (v_fitting->>'width')::INTEGER,
      (v_fitting->>'height')::INTEGER,
      (v_fitting->>'prompt')
    )
    RETURNING id, result_url, aspect_ratio, width, height, model_image_url
    INTO v_id, v_result_url, v_ar, v_width, v_height, v_model_url;

    v_records := v_records || jsonb_build_array(
      jsonb_build_object(
        'id',             v_id,
        'result_url',     v_result_url,
        'aspect_ratio',   v_ar,
        'width',          v_width,
        'height',         v_height,
        'model_image_url', v_model_url
      )
    );
  END LOOP;

  -- 2. usage_events 기록
  INSERT INTO public.usage_events (user_id, project_id, event_type, credits_used, metadata)
  VALUES (p_user_id, p_project_id, 'ai_fitting_generated', p_credits, p_metadata);

  -- 3. 크레딧 차감 (0 미만 방지)
  UPDATE public.user_profiles
  SET    credits_left = GREATEST(credits_left - p_credits, 0),
         updated_at   = NOW()
  WHERE  id = p_user_id;

  RETURN jsonb_build_object('records', v_records);
END;
$$;

COMMENT ON FUNCTION public.record_ai_fitting_generation IS
  'BUG-01: ai_fittings INSERT + usage_events INSERT + credits 차감을 단일 트랜잭션으로 처리';

-- ─── 권한 부여 ───────────────────────────────────────────────────────────────
-- authenticated role 이 RPC 호출 가능하도록 (SECURITY DEFINER 이므로 실행 권한만 필요)
GRANT EXECUTE ON FUNCTION public.record_thumbnail_generation TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_ai_fitting_generation TO authenticated;
