/**
 * SSE 클라이언트 파서
 * `text/event-stream` 응답을 줄 단위로 파싱하여 PipelineEvent 콜백을 호출한다.
 */

import type { PipelineEvent } from './types'

export async function consumePipelineSSE(
  response: Response,
  onEvent: (event: PipelineEvent) => void
): Promise<void> {
  if (!response.body) throw new Error('스트림 응답 본문이 비어있습니다.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE 표준: 이벤트는 `\n\n` 구분
      let sep: number
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)

        // 한 이벤트 내 여러 줄 중 `data: ` 만 추출
        const dataLines = rawEvent
          .split('\n')
          .filter((l) => l.startsWith('data: '))
          .map((l) => l.slice(6))
        if (dataLines.length === 0) continue

        const json = dataLines.join('\n')
        try {
          const event = JSON.parse(json) as PipelineEvent
          onEvent(event)
        } catch (err) {
          console.warn('[sse-client] JSON parse 실패:', json.slice(0, 100), err)
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
