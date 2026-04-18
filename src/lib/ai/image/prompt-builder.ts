/**
 * 5계층 프롬프트 조립기
 * ai-pipeline-dev 에이전트가 buildImagePrompt()를 구현합니다.
 */

export interface PromptLayers {
  /** [1] 원본 제품 유지 — Subject Anchor */
  subjectAnchor: string
  /** [2] 배경·공간 설정 */
  scene: string
  /** [3] 무드·스타일 (한국 쇼핑몰 스타일 가이드 기반) */
  moodStyle: string
  /** [4] 구도·앵글 (종횡비별 최적화) */
  composition: string
  /** [5] 텍스트 삽입 (한글 배지, 선택사항) */
  textOverlay?: string
}

/**
 * 5계층을 조립하여 최종 이미지 생성 프롬프트를 반환합니다.
 * @param layers - 5개 계층 프롬프트 구성 요소
 * @returns 조립된 최종 프롬프트 문자열
 * @throws Error - 구현 전 호출 시 (TODO: ai-pipeline-dev 구현 필요)
 */
export function buildImagePrompt(layers: PromptLayers): string {
  // TODO: ai-pipeline-dev 에이전트가 구현
  throw new Error('Not implemented')
}
