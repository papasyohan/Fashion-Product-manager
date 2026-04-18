/**
 * 트렌드 키워드 래퍼 (T-07)
 * 현재: 카테고리별 정적 트렌드 + 캐시
 * Sprint 2+: 네이버 DataLab API 연동 예정
 */

export interface TrendResult {
  keywords: string[]
  fetchedAt: string
  fromCache: boolean
  fromFallback: boolean
}

// 인메모리 캐시 (TTL: 1시간)
const cache = new Map<string, { result: TrendResult; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1시간

// 카테고리별 기본 트렌드 키워드 (fallback)
const TREND_DATA: Record<string, string[]> = {
  텀블러: ['데일리템', '감성텀블러', '아이스보틀', '보냉컵', '오피스룩', '캠퍼스룩'],
  의류: ['오버핏', '캐주얼', '데일리룩', '미니멀', '시즌오프', '신상'],
  가방: ['크로스백', '미니백', '데일리백', '캐주얼백', '가방추천'],
  신발: ['운동화', '슬립온', '데일리슈즈', '컴포트', '신발추천'],
  악세서리: ['데일리주얼리', '미니멀링', '레이어드', '포인트악세서리'],
  스마트폰케이스: ['아이폰케이스', '갤럭시케이스', '투명케이스', '캐릭터케이스'],
  화장품: ['스킨케어', '비건뷰티', '데일리메이크업', '촉촉보습', '선케어'],
  식품: ['건강식품', '다이어트', '단백질', '비건', '홈카페'],
  기타: ['데일리템', '추천템', '신상품', '가성비', '인스타감성'],
}

export async function fetchTrendKeywords(params: {
  category: string
  _forceError?: boolean
}): Promise<TrendResult> {
  const { category, _forceError } = params

  // 테스트용 강제 에러 플래그
  if (_forceError) {
    return {
      keywords: getFallbackKeywords(category),
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      fromFallback: true,
    }
  }

  // 캐시 확인
  const cached = cache.get(category)
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.result, fromCache: true }
  }

  try {
    // TODO: Sprint 2 — 네이버 DataLab API 연동
    // 현재는 정적 데이터 반환
    const keywords = getTrendKeywords(category)
    const result: TrendResult = {
      keywords,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      fromFallback: false,
    }

    cache.set(category, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })

    return result
  } catch {
    return {
      keywords: getFallbackKeywords(category),
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      fromFallback: true,
    }
  }
}

function getTrendKeywords(category: string): string[] {
  // 카테고리 정규화 (부분 일치)
  for (const [key, keywords] of Object.entries(TREND_DATA)) {
    if (category.includes(key) || key.includes(category)) {
      return keywords
    }
  }
  return TREND_DATA['기타']!
}

function getFallbackKeywords(category: string): string[] {
  return getTrendKeywords(category)
}
