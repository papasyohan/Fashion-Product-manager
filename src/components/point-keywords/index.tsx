/**
 * PointKeywords — 포인트 키워드 chip 렌더링 (display-only)
 *
 * description 생성 단계에서 추출된 소재·핏·시즌·스타일 태그 3~5개를
 * 패션 매거진 톤의 작은 pill chip 으로 보여준다.
 *
 * 디자인: KeywordsEditor (detail-page-editor) 의 chip 토큰을 재사용 —
 * rounded-full · text-[11px] font-semibold · hairline border · # prefix.
 * - light: 흰 배경 위 회색 pill (상세페이지 hero 본문)
 * - dark : 검정 한줄카피 블록 위 near-black pill (AA 대비 유지)
 *
 * keywords 가 비어있거나 undefined 면 null 을 반환 →
 * 빈 컨테이너·여백·layout shift 없음.
 */

interface PointKeywordsProps {
  keywords?: string[]
  /** light: 흰 배경용 / dark: 검정 블록용. 기본 light */
  variant?: 'light' | 'dark'
  /** 컨테이너 추가 클래스 (여백 조정 등) */
  className?: string
}

export function PointKeywords({ keywords, variant = 'light', className }: PointKeywordsProps) {
  const tags = keywords?.filter((k) => k.trim().length > 0) ?? []
  if (tags.length === 0) return null

  const chipStyle =
    variant === 'dark'
      ? { backgroundColor: '#1c1c1c', color: '#ffffff', border: '1px solid #3a3a3a' }
      : { backgroundColor: '#f5f5f5', color: '#111111', border: '1px solid #e5e5e5' }

  return (
    <ul
      aria-label="포인트 키워드"
      className={`flex flex-wrap gap-1.5${className ? ` ${className}` : ''}`}
    >
      {tags.map((tag, i) => (
        <li
          key={`${tag}-${i}`}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
          style={chipStyle}
        >
          #{tag}
        </li>
      ))}
    </ul>
  )
}
