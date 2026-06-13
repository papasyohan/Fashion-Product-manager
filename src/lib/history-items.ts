/**
 * 히스토리 페이지용 공유 타입 / 헬퍼
 *
 * 일반 생성물(projects)과 AI 피팅 결과(ai_fittings)를 하나의 히스토리 뷰에
 * 통합하기 위한 정규화 타입을 제공한다.
 *
 * ai_fittings 테이블에는 user_id 컬럼이 없으며, RLS 가 project_id -> projects.user_id
 * 조인을 통해 본인 데이터만 조회되도록 보장한다 (009_ai_fittings.sql).
 * 따라서 이 헬퍼는 반드시 인증된 서버 클라이언트(createClient)로 가져온 행에만 적용한다.
 */

/** 정규화된 AI 피팅 히스토리 아이템 — 클라이언트 렌더링용 */
export interface FittingHistoryItem {
  id: string
  projectId: string
  /** 생성된 합성 이미지 (Supabase Storage public URL) */
  resultUrl: string
  /** 사용자가 올린 모델 사진 URL (없을 수 있음) */
  modelImageUrl: string | null
  /** 부모 프로젝트의 원본 제품 이미지 (embed, 없을 수 있음) */
  productImageUrl: string | null
  /** 부모 프로젝트 모드 ('quick' | 'studio') — embed (없을 수 있음) */
  projectMode: string | null
  aspectRatio: string | null
  width: number | null
  height: number | null
  createdAt: string
}

/**
 * PostgREST 가 반환한 ai_fittings 원시 행 형태.
 * 임베드한 projects 관계는 to-one 이므로 객체이지만, 생성 타입이 없는 환경에서는
 * 배열/널 형태로도 들어올 수 있어 방어적으로 모두 허용한다.
 */
interface RawEmbeddedProject {
  mode?: string | null
  product_image_url?: string | null
}

interface RawFittingRow {
  id?: string | null
  project_id?: string | null
  result_url?: string | null
  model_image_url?: string | null
  aspect_ratio?: string | null
  width?: number | null
  height?: number | null
  created_at?: string | null
  projects?: RawEmbeddedProject | RawEmbeddedProject[] | null
}

/** to-one embed 가 객체/배열 어느 형태로 와도 단일 객체로 정규화 */
function pickEmbeddedProject(
  projects: RawFittingRow['projects']
): RawEmbeddedProject | null {
  if (!projects) return null
  if (Array.isArray(projects)) return projects[0] ?? null
  return projects
}

/**
 * 원시 ai_fittings 행 배열을 FittingHistoryItem[] 으로 정규화.
 * - id / result_url / created_at 이 비어 있는 손상된 행은 제외(히스토리에서 렌더 불가).
 * - 임베드 projects 가 누락되어도 안전하게 null 로 처리.
 */
export function mapFittingRows(rows: unknown): FittingHistoryItem[] {
  if (!Array.isArray(rows)) return []

  const items: FittingHistoryItem[] = []
  for (const raw of rows as RawFittingRow[]) {
    if (!raw) continue
    const id = raw.id ?? undefined
    const resultUrl = raw.result_url ?? undefined
    const createdAt = raw.created_at ?? undefined
    // 렌더에 필수인 필드가 없으면 건너뜀 (방어적)
    if (!id || !resultUrl || !createdAt) continue

    const project = pickEmbeddedProject(raw.projects)

    items.push({
      id,
      projectId: raw.project_id ?? '',
      resultUrl,
      modelImageUrl: raw.model_image_url ?? null,
      productImageUrl: project?.product_image_url ?? null,
      projectMode: project?.mode ?? null,
      aspectRatio: raw.aspect_ratio ?? null,
      width: raw.width ?? null,
      height: raw.height ?? null,
      createdAt,
    })
  }
  return items
}
