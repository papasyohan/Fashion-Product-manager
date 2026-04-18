import { redirect } from 'next/navigation'

/**
 * 루트 경로 → 스튜디오 페이지로 리다이렉트
 * Sprint 1에서 랜딩 페이지 추가 예정
 */
export default function RootPage() {
  redirect('/studio')
}
