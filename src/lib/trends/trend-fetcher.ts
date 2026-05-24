/**
 * 트렌드 키워드 래퍼 (T-07)
 *
 * 흐름:
 *   1. 인메모리 캐시 1시간
 *   2. 네이버 DataLab API (NAVER_DATALAB_CLIENT_ID/SECRET 설정 시)
 *   3. 정적 카테고리별 fallback
 *
 * Phase 3 (v1.1) — 네이버 실연동 추가. 키 미설정 시 정적 fallback.
 */

export interface TrendResult {
  keywords: string[]
  fetchedAt: string
  fromCache: boolean
  fromFallback: boolean
  /** 'naver-datalab' | 'static' — 디버깅용 */
  source?: 'naver-datalab' | 'static'
}

// 인메모리 캐시 (TTL: 1시간)
// 주의: Edge Runtime (pipeline/route.ts) 에서는 요청마다 새 V8 isolate 가 생성되어
// 이 캐시는 실질적으로 항상 miss 다. Node.js Serverless (warm lambda) 에서만 효과 있음.
// 캐시 miss 시 네이버 DataLab 호출 또는 static fallback 으로 graceful degrade.
const cache = new Map<string, { result: TrendResult; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000

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

/**
 * 카테고리 부분 일치로 정적 트렌드 조회
 */
function getStaticKeywords(category: string): string[] {
  for (const [key, keywords] of Object.entries(TREND_DATA)) {
    if (category.includes(key) || key.includes(category)) {
      return keywords
    }
  }
  return TREND_DATA['기타']!
}

/**
 * 네이버 DataLab 검색 트렌드 호출
 * https://developers.naver.com/docs/serviceapi/datalab/search/search.md
 *
 * 카테고리 키워드를 seed 로 사용해 상승률 높은 관련 키워드를 가져온다.
 * 응답에서 ratio 가 높은 순으로 정렬해 keyword 명을 추출.
 *
 * Edge Runtime 호환 (fetch 만 사용).
 */
async function fetchFromNaverDataLab(category: string): Promise<string[] | null> {
  const clientId = process.env.NAVER_DATALAB_CLIENT_ID
  const clientSecret = process.env.NAVER_DATALAB_CLIENT_SECRET
  if (!clientId || !clientSecret) return null // 키 미설정 → fallback

  // seed 키워드 = 정적 fallback (네이버 API 는 keywordGroups 필수)
  const seedKeywords = getStaticKeywords(category).slice(0, 5)

  const today = new Date()
  const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  try {
    const res = await fetch('https://openapi.naver.com/v1/datalab/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
      body: JSON.stringify({
        startDate: fmt(ninetyDaysAgo),
        endDate: fmt(today),
        timeUnit: 'week',
        keywordGroups: seedKeywords.map((kw) => ({
          groupName: kw,
          keywords: [kw],
        })),
      }),
    })

    if (!res.ok) {
      console.warn('[trend-fetcher] naver datalab failed:', res.status)
      return null
    }

    const data = await res.json() as {
      results?: Array<{
        title: string
        data: Array<{ period: string; ratio: number }>
      }>
    }

    if (!data.results || data.results.length === 0) return null

    // 평균 ratio 가 높은 순으로 정렬 (관심도 ↑)
    const ranked = data.results
      .map((r) => ({
        title: r.title,
        avgRatio: r.data.reduce((sum, d) => sum + d.ratio, 0) / Math.max(r.data.length, 1),
      }))
      .sort((a, b) => b.avgRatio - a.avgRatio)
      .map((r) => r.title)

    return ranked
  } catch (err) {
    console.warn('[trend-fetcher] naver datalab error:', err)
    return null
  }
}

export async function fetchTrendKeywords(params: {
  category: string
  _forceError?: boolean
}): Promise<TrendResult> {
  const { category, _forceError } = params

  if (_forceError) {
    return {
      keywords: getStaticKeywords(category),
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      fromFallback: true,
      source: 'static',
    }
  }

  // 캐시 hit
  const cached = cache.get(category)
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.result, fromCache: true }
  }

  // Phase 3.3 — 네이버 DataLab 실연동 시도
  const liveKeywords = await fetchFromNaverDataLab(category).catch(() => null)

  let result: TrendResult
  if (liveKeywords && liveKeywords.length > 0) {
    result = {
      keywords: liveKeywords,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      fromFallback: false,
      source: 'naver-datalab',
    }
  } else {
    result = {
      keywords: getStaticKeywords(category),
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      fromFallback: true,
      source: 'static',
    }
  }

  cache.set(category, { result, expiresAt: Date.now() + CACHE_TTL_MS })
  return result
}
