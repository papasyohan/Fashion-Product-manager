/**
 * AI 멀티 프로바이더 라우터
 *
 * 환경변수로 작업별 모델을 선택합니다.
 *   MODEL_<TASK>=<provider>:<model-id>
 *   MODEL_<TASK>_FALLBACK=<provider>:<model-id>
 *
 * 예시:
 *   MODEL_ANALYZE=google:gemini-2.5-flash
 *   MODEL_ANALYZE_FALLBACK=anthropic:claude-sonnet-4-5
 *
 * provider 종류:
 *   - anthropic           Claude (ANTHROPIC_API_KEY 필요)
 *   - google              Gemini (GOOGLE_GENERATIVE_AI_API_KEY 필요)
 *   - local               OpenAI-호환 로컬 엔드포인트
 *                         (LOCAL_LLM_BASE_URL, LOCAL_LLM_API_KEY 필요)
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'
import type { AITask, AIProvider, ModelSpec } from './types'

// ─── 기본값 (env 미설정 시 fallback) ────────────────────────────────────────

const DEFAULTS: Record<AITask, ModelSpec> = {
  analyze:     'google:gemini-2.5-flash',
  naming:      'anthropic:claude-sonnet-4-5',
  tagline:     'google:gemini-2.5-flash',
  description: 'anthropic:claude-sonnet-4-5',
  detail_page: 'anthropic:claude-sonnet-4-5',
}

const DEFAULT_FALLBACKS: Record<AITask, ModelSpec> = {
  analyze:     'anthropic:claude-sonnet-4-5',
  naming:      'google:gemini-2.5-pro',
  tagline:     'anthropic:claude-sonnet-4-5',
  description: 'google:gemini-2.5-pro',
  detail_page: 'google:gemini-2.5-pro',
}

// ─── ModelSpec 파싱 ────────────────────────────────────────────────────────

function parseSpec(spec: ModelSpec): { provider: AIProvider; modelId: string } {
  const [provider, ...rest] = spec.split(':')
  const modelId = rest.join(':') // 콜론이 모델명에 포함될 수도 있음 (예: openrouter)
  if (!provider || !modelId) {
    throw new Error(
      `Invalid ModelSpec "${spec}". 형식: "provider:model-id" (예: "anthropic:claude-sonnet-4-5")`
    )
  }
  if (provider !== 'anthropic' && provider !== 'google' && provider !== 'local') {
    throw new Error(
      `Unknown provider "${provider}". 지원: anthropic, google, local`
    )
  }
  return { provider: provider as AIProvider, modelId }
}

// ─── 프로바이더 팩토리 (lazy init, edge-safe) ──────────────────────────────

function getAnthropicProvider() {
  return createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

function getGoogleProvider() {
  return createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  })
}

function getLocalProvider() {
  const baseURL = process.env.LOCAL_LLM_BASE_URL
  if (!baseURL) {
    throw new Error(
      'LOCAL_LLM_BASE_URL이 설정되지 않았습니다. (예: http://localhost:11434/v1)'
    )
  }
  return createOpenAICompatible({
    name: 'local',
    baseURL,
    apiKey: process.env.LOCAL_LLM_API_KEY ?? 'not-needed',
  })
}

// ─── ModelSpec → LanguageModel 변환 ────────────────────────────────────────

function buildModel(spec: ModelSpec): LanguageModel {
  const { provider, modelId } = parseSpec(spec)
  switch (provider) {
    case 'anthropic':
      return getAnthropicProvider()(modelId)
    case 'google':
      return getGoogleProvider()(modelId)
    case 'local':
      return getLocalProvider()(modelId)
  }
}

// ─── 작업별 모델 + Fallback 체인 조회 ──────────────────────────────────────

export interface ResolvedModels {
  primary: LanguageModel
  fallback: LanguageModel | null
  primarySpec: ModelSpec
  fallbackSpec: ModelSpec | null
}

/**
 * 작업명으로 1순위·2순위 모델을 조회한다.
 * env 미설정 시 DEFAULTS 사용.
 */
export function resolveModels(task: AITask): ResolvedModels {
  const envKey = `MODEL_${task.toUpperCase()}`
  const envFallbackKey = `MODEL_${task.toUpperCase()}_FALLBACK`

  const primarySpec = process.env[envKey] || DEFAULTS[task]
  const fallbackSpec = process.env[envFallbackKey] || DEFAULT_FALLBACKS[task]

  const primary = buildModel(primarySpec)
  // 1순위와 2순위가 같으면 fallback 없음
  const fallback =
    fallbackSpec && fallbackSpec !== primarySpec ? buildModel(fallbackSpec) : null

  return {
    primary,
    fallback,
    primarySpec,
    fallbackSpec: fallback ? fallbackSpec : null,
  }
}

/**
 * 1순위 실패(rate limit / 잔액부족 / 일시 에러) 시 2순위로 자동 재시도하는 헬퍼.
 * 호출자가 model을 인자로 받는 작업(generateObject, streamText 등)을 함수로 감싸 전달한다.
 *
 * 예시:
 *   const result = await runWithFallback('naming', (model) =>
 *     generateObject({ model, schema, prompt })
 *   )
 */
export async function runWithFallback<T>(
  task: AITask,
  fn: (model: LanguageModel, spec: ModelSpec) => Promise<T>
): Promise<T> {
  const { primary, fallback, primarySpec, fallbackSpec } = resolveModels(task)
  try {
    return await fn(primary, primarySpec)
  } catch (err) {
    if (!fallback || !fallbackSpec) throw err
    if (!isRetriableError(err)) throw err
    console.warn(
      `[ai/router] task=${task} primary="${primarySpec}" failed → fallback="${fallbackSpec}"`,
      err instanceof Error ? err.message : err
    )
    return await fn(fallback, fallbackSpec)
  }
}

/** 어떤 에러가 fallback 트리거할지 — 잔액·rate-limit·일시적 네트워크 오류 */
function isRetriableError(err: unknown): boolean {
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  const status = (err as { status?: number; statusCode?: number })?.status
              ?? (err as { status?: number; statusCode?: number })?.statusCode

  if (status === 429 || status === 402 || status === 503 || status === 529) return true
  if (/rate.?limit|too many requests|overloaded|capacity/i.test(message)) return true
  if (/credit.?balance|insufficient.*credit|quota/i.test(message)) return true
  if (/timeout|aborted|econnreset|fetch.?failed/i.test(message)) return true
  return false
}
