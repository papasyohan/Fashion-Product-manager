# AI 아키텍처 가이드

ProductCraft AI 의 LLM 통합 구조, 멀티 프로바이더 라우팅, 스트리밍 파이프라인 전체 가이드.

---

## 1. 설계 원칙

1. **벤더 락인 해소** — 한 프로바이더가 다운돼도 서비스가 계속 동작해야 한다.
2. **작업별 최적화** — 분석 vs 한국어 카피 vs 짧은 태그라인은 각각 다른 모델이 효율적.
3. **비용·품질 트레이드오프 명시화** — 환경변수 한 줄로 작업별 모델 교체 가능.
4. **스트리밍 우선** — 사용자가 진행 상황을 즉시 볼 수 있어야 한다 (Edge Runtime + SSE).
5. **로컬 LLM 미래 호환** — OpenAI 호환 엔드포인트(Ollama/vLLM)로 동일 인터페이스 사용.

---

## 2. 시스템 구성도

```
┌──────────────────────────────────────────────────────────────────────┐
│  CLIENT (src/app/(app)/studio/page.tsx)                              │
│                                                                      │
│  fetch('/api/generate/pipeline', { body: { imageUrl, mode } })       │
│        │                                                             │
│        └─→ consumePipelineSSE(res, onEvent)                          │
│            │                                                         │
│            ├─ progress    → store.setStatus(...)                     │
│            ├─ project     → store.setProjectId(...)                  │
│            ├─ analysis    → store.local analysisData                 │
│            ├─ names       → store.local names                        │
│            ├─ tagline     → store.local tagline                      │
│            ├─ description_chunk → progressive write                  │
│            ├─ description_done                                       │
│            ├─ complete                                               │
│            └─ error                                                  │
└──────────────────────────────────────────────────────────────────────┘
                              │ HTTP POST
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  PIPELINE ROUTE (Edge Runtime)                                       │
│  src/app/api/generate/pipeline/route.ts                              │
│                                                                      │
│  return new Response(new ReadableStream({                            │
│    async start(controller) {                                         │
│      emit({type:'progress', step:'project_create', percent:5})       │
│      → supabase.from('projects').insert(...)                         │
│      emit({type:'project', projectId})                               │
│                                                                      │
│      emit({type:'progress', step:'analyze', percent:25})             │
│      const analysis = await analyzeProductImage(...)                 │
│      emit({type:'analysis', data: analysis})                         │
│                                                                      │
│      emit({type:'progress', step:'naming', percent:50})              │
│      const [trends, naming] = await Promise.all([                    │
│        fetchTrendKeywords(...),                                      │
│        generateProductNames(...)                                     │
│      ])                                                              │
│      emit({type:'names', data: naming.names, trendTags})             │
│                                                                      │
│      emit({type:'progress', step:'tagline', percent:70})             │
│      const tagline = await generateTagline(...)                      │
│      emit({type:'tagline', data: tagline})                           │
│                                                                      │
│      emit({type:'progress', step:'description', percent:80})         │
│      const stream = streamDescription(...)                           │
│      for await (const partial of stream.partialObjectStream) {       │
│        emit({type:'description_chunk', text: ...delta})              │
│      }                                                               │
│      emit({type:'description_done', data, highlights})               │
│                                                                      │
│      → deductCredits + usage_events                                  │
│      emit({type:'complete', elapsedMs})                              │
│    }                                                                 │
│  }))                                                                 │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  AGENT MODULES (signature-preserved)                                 │
│  src/lib/ai/{analyzers,generators}/*.ts                              │
│                                                                      │
│  analyzeProductImage     → generateObject + AnalyzeSchema (vision)   │
│  generateProductNames    → generateObject + NamingSchema             │
│  generateTagline         → generateObject + TaglineSchema            │
│  generateDescription     → generateObject + DescriptionSchema        │
│  streamDescription       → streamObject  + DescriptionSchema         │
│                                                                      │
│  모두 runWithFallback('<task>', (model) => ...) 로 감싸짐             │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  ROUTER (src/lib/ai/router.ts)                                       │
│                                                                      │
│  resolveModels(task) → { primary, fallback, primarySpec, ... }       │
│      │                                                               │
│      └─ env: MODEL_<TASK>=<provider>:<model-id>                      │
│         (미설정 시 DEFAULTS 사용)                                      │
│                                                                      │
│  runWithFallback(task, fn)                                           │
│      try fn(primary)                                                 │
│      catch (isRetriableError) → fn(fallback)                         │
│                                                                      │
│  isRetriableError: 429 / 402 / 503 / 529 / "rate limit" /            │
│                    "credit balance" / "timeout" / "fetch failed"     │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
  ┌──────────┐         ┌──────────┐          ┌──────────┐
  │@ai-sdk/  │         │@ai-sdk/  │          │@ai-sdk/  │
  │anthropic │         │google    │          │openai-   │
  │          │         │          │          │compat    │
  └────┬─────┘         └────┬─────┘          └────┬─────┘
       │                    │                     │
       ▼                    ▼                     ▼
  Anthropic API       Google AI API         Ollama / vLLM / LM Studio
  (Claude)            (Gemini)              (로컬 또는 셀프 호스팅)
```

---

## 3. 작업(Task) 정의

`src/lib/ai/types.ts` 의 `AITask` :

| Task | 입력 | 출력 (Zod 스키마) | 기본 모델 (1순위) | 기본 Fallback |
|------|------|-----------------|-----------------|--------------|
| `analyze` | 제품 이미지 (URL or base64) | `AnalyzeSchema` (category, keywords, mood, ...) | `google:gemini-2.5-flash` | `anthropic:claude-sonnet-4-5` |
| `naming` | 카테고리, 키워드, 트렌드 | `NamingSchema` (3종 상품명 + 해시태그) | `anthropic:claude-sonnet-4-5` | `google:gemini-2.5-pro` |
| `tagline` | 상품명, 카테고리, 무드 | `TaglineSchema` (35자 카피) | `google:gemini-2.5-flash` | `anthropic:claude-sonnet-4-5` |
| `description` | 상품명, 태그라인, 키워드 | `DescriptionSchema` (400~800자 + 셀링포인트) | `anthropic:claude-sonnet-4-5` | `google:gemini-2.5-pro` |
| `detail_page` | (현재 미사용 — HTML 조립에만 사용) | — | `anthropic:claude-sonnet-4-5` | `google:gemini-2.5-pro` |

---

## 4. 환경변수

### 4.1 API 키 (필수 — 사용하는 프로바이더만)

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...           # Claude 사용 시
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...       # Gemini 사용 시 (이미지 생성용으로도 필수)
LOCAL_LLM_BASE_URL=http://localhost:11434/v1 # 로컬 LLM 사용 시
LOCAL_LLM_API_KEY=ollama                     # vLLM 인증 키 또는 임의값
```

### 4.2 모델 라우팅 (선택 — 미설정 시 DEFAULTS)

```bash
# 형식: provider:model-id
MODEL_<TASK>=<provider>:<model-id>
MODEL_<TASK>_FALLBACK=<provider>:<model-id>
```

- `<TASK>` ∈ `ANALYZE` / `NAMING` / `TAGLINE` / `DESCRIPTION`
- `<provider>` ∈ `anthropic` / `google` / `local`

### 4.3 개발 우회 플래그

```bash
DEV_BYPASS_CREDITS=true   # 크레딧/플랜 검사 스킵 (테스트 전용, 프로덕션 금지)
```

---

## 5. 추천 모델 조합

### 🥇 가성비 최고 (월 1만건 미만, 권장)

```bash
MODEL_ANALYZE=google:gemini-2.5-flash
MODEL_ANALYZE_FALLBACK=anthropic:claude-sonnet-4-5
MODEL_NAMING=anthropic:claude-sonnet-4-5
MODEL_NAMING_FALLBACK=google:gemini-2.5-pro
MODEL_TAGLINE=google:gemini-2.5-flash
MODEL_TAGLINE_FALLBACK=anthropic:claude-sonnet-4-5
MODEL_DESCRIPTION=anthropic:claude-sonnet-4-5
MODEL_DESCRIPTION_FALLBACK=google:gemini-2.5-pro
```

**예상 비용**: 1회 생성당 **$0.008 ~ $0.015** (Starter ₩19,900 / 50건 기준 마진 ≥ 94%)

### 🥈 풀 Gemini (최저비용, 한국어 품질 살짝 ↓)

```bash
MODEL_ANALYZE=google:gemini-2.5-flash
MODEL_NAMING=google:gemini-2.5-pro
MODEL_TAGLINE=google:gemini-2.5-flash
MODEL_DESCRIPTION=google:gemini-2.5-pro
```

**예상 비용**: 1회 생성당 **$0.003 ~ $0.005**

### 🥉 풀 Claude (최고 품질, 비싼 옵션)

```bash
MODEL_ANALYZE=anthropic:claude-sonnet-4-5
MODEL_NAMING=anthropic:claude-sonnet-4-5
MODEL_TAGLINE=anthropic:claude-sonnet-4-5
MODEL_DESCRIPTION=anthropic:claude-sonnet-4-5
```

**예상 비용**: 1회 생성당 **$0.04 ~ $0.08**

---

## 6. SSE 이벤트 프로토콜

서버는 `text/event-stream` 응답으로 다음 JSON 이벤트를 보냅니다.
클라이언트는 `src/lib/ai/sse-client.ts` 의 `consumePipelineSSE` 로 파싱합니다.

```typescript
type PipelineEvent =
  | { type: 'progress'; step: PipelineStep; percent: number }
  | { type: 'project'; projectId: string }
  | { type: 'analysis'; data: AnalyzeOutput }
  | { type: 'names'; data: NamingOutput['names']; trendTags: string[] }
  | { type: 'tagline'; data: string }
  | { type: 'description_chunk'; text: string }
  | { type: 'description_done'; data: string; highlights: string[] }
  | { type: 'complete'; elapsedMs: number }
  | { type: 'error'; message: string; step?: PipelineStep; status?: number }

type PipelineStep =
  | 'project_create' | 'analyze' | 'naming' | 'tagline' | 'description'
```

### 와이어 포맷

```
data: {"type":"progress","step":"analyze","percent":25}

data: {"type":"analysis","data":{"category":"텀블러","keywords":[...]}}

data: {"type":"description_chunk","text":"한 모금 마실 때마다..."}

data: {"type":"complete","elapsedMs":12345}

```

각 이벤트는 `data: ` 줄 + 빈 줄 (`\n\n`) 으로 구분됩니다.

---

## 7. 새 작업(Task) 추가하기

예: `slogan` 작업을 추가한다고 가정.

### Step 1. `src/lib/ai/types.ts`

```typescript
export type AITask = ... | 'slogan'

export const SloganSchema = z.object({
  slogan: z.string().max(20),
})
export type SloganOutput = z.infer<typeof SloganSchema>
```

### Step 2. `src/lib/ai/router.ts`

```typescript
const DEFAULTS: Record<AITask, ModelSpec> = {
  ...
  slogan: 'google:gemini-2.5-flash',
}

const DEFAULT_FALLBACKS: Record<AITask, ModelSpec> = {
  ...
  slogan: 'anthropic:claude-sonnet-4-5',
}
```

### Step 3. Agent 모듈 (`src/lib/ai/generators/slogan-agent.ts`)

```typescript
import { generateObject } from 'ai'
import { runWithFallback } from '@/lib/ai/router'
import { SloganSchema } from '@/lib/ai/types'

export async function generateSlogan(params: {...}) {
  const result = await runWithFallback('slogan', (model) =>
    generateObject({
      model,
      schema: SloganSchema,
      system: '...',
      prompt: '...',
      maxOutputTokens: 128,
    })
  )
  return result.object
}
```

### Step 4. 라우트 또는 파이프라인에 추가

개별 엔드포인트라면:
```typescript
// src/app/api/generate/slogan/route.ts
export const runtime = 'edge'
export const dynamic = 'force-dynamic'
// ... POST handler
```

### Step 5. 환경변수 (선택)

```bash
MODEL_SLOGAN=anthropic:claude-haiku-4-5
MODEL_SLOGAN_FALLBACK=google:gemini-2.5-flash
```

---

## 8. 새 프로바이더 추가하기

예: OpenAI 추가.

### Step 1. 패키지 설치

```bash
pnpm add -w @ai-sdk/openai
```

### Step 2. `src/lib/ai/router.ts` 수정

```typescript
import { createOpenAI } from '@ai-sdk/openai'

export type AIProvider = 'anthropic' | 'google' | 'local' | 'openai'

function getOpenAIProvider() {
  return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

function buildModel(spec: ModelSpec): LanguageModel {
  ...
  case 'openai': return getOpenAIProvider()(modelId)
}
```

### Step 3. 환경변수

```bash
OPENAI_API_KEY=sk-...
MODEL_NAMING=openai:gpt-4o
```

---

## 9. 로컬 LLM 운영 가이드

### Ollama (Mac/Linux, 가장 빠른 시작)

```bash
# 설치
brew install ollama && brew services start ollama

# 모델 다운로드
ollama pull qwen2.5:32b-instruct
ollama pull llama3.3:70b
ollama pull exaone3.5:32b      # LG AI Research, 한국어 특화

# .env.local
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_API_KEY=ollama
MODEL_DESCRIPTION=local:qwen2.5:32b-instruct
```

### vLLM (프로덕션 GPU 서버)

```bash
pip install vllm

vllm serve LGAI-EXAONE/EXAONE-3.5-32B-Instruct \
  --host 0.0.0.0 --port 8000 \
  --api-key SECRET_TOKEN \
  --max-model-len 32768
```

**Vercel 에서 호출하려면** 로컬 LLM 이 공개 HTTPS 엔드포인트로 노출돼 있어야 합니다:
- Cloudflare Tunnel
- Tailscale Funnel
- ngrok / Cloudflare-named-tunnel
- AWS/GCP 등에 직접 배포

```bash
vercel env add LOCAL_LLM_BASE_URL production
# 입력: https://llm.your-domain.com/v1

vercel env add LOCAL_LLM_API_KEY production
# 입력: SECRET_TOKEN
```

### 도입 임계점

지금 단계에서는 **권장하지 않습니다**. 다음 지표 도달 시 재검토:
- 월 1만 건 이상 생성 → GPU 운영 BEP 근접
- B2B 고객 "데이터 외부 전송 불가" 요구
- 한국어 sLLM 품질이 Claude/Gemini Pro 와 동등해질 때

---

## 10. Edge Runtime 주의사항

`export const runtime = 'edge'` 가 적용된 라우트에서 사용 불가:

- ❌ Node.js 네이티브 모듈 (`fs`, `path`, `child_process`, `crypto.randomBytes` from Node)
- ❌ Anthropic / Google SDK 의 v1 (구버전) — AI SDK 가 Edge 호환 어댑터 제공
- ❌ Cache Components (Next.js 16 제약)

사용 가능:
- ✅ Web Fetch API
- ✅ Web Streams API (`ReadableStream`, `TextEncoder`)
- ✅ `@supabase/ssr` (Edge 호환)
- ✅ `next/headers` cookies()
- ✅ `crypto.subtle` (Web Crypto API)

---

## 11. 트러블슈팅

### 11.1 "Anthropic API 크레딧이 부족합니다"

→ https://console.anthropic.com/settings/billing 에서 충전. Fallback 이 설정돼 있으면 자동으로 Gemini 로 우회됨.

### 11.2 스트리밍 응답이 청크로 안 오고 한꺼번에 옴

확인:
- 응답 헤더에 `X-Accel-Buffering: no` 가 있는지 (pipeline 라우트는 자동 설정)
- 프록시(Cloudflare 등) 가 `text/event-stream` 을 버퍼링하지 않는지
- 클라이언트가 `consumePipelineSSE` 를 통과하는지

### 11.3 `MODEL_<TASK>` 환경변수 변경 후 적용 안 됨

→ Vercel 은 재배포 필요. `vercel --prod` 또는 `git commit --allow-empty -m "trigger rebuild" && git push`.

### 11.4 로컬 LLM 호출 실패 (CORS / connection refused)

확인:
- `LOCAL_LLM_BASE_URL` 끝에 `/v1` 이 있는지
- Vercel 에서 호출 시 공개 HTTPS 엔드포인트인지
- Ollama 인 경우 `OLLAMA_HOST=0.0.0.0` 환경변수로 바인딩 확인

---

## 12. 비용 관측 (TODO)

현재 미구현. 다음 Phase 에서 추가 예정:

- `generation_events` 테이블에 `provider`, `model`, `latency_ms`, `tokens_in/out` 기록
- Vercel Analytics 또는 Supabase 대시보드로 작업별 비용 시각화
- A/B 테스트 (1순위 vs 2순위 품질 비교 + 비용 차트)

---

## 12-A. 사용자 의도 / 보정 지시 주입 (v1.1 — UX Customization)

상세 사양은 [`UX_CUSTOMIZATION.md`](./UX_CUSTOMIZATION.md) 참조.

### 데이터 흐름

```
Client (IntentForm)
   ↓ userIntent
Studio Store
   ↓ userIntent + refinement
API Route (/api/generate/<task>)
   ↓ Zod schema 통과
runWithFallback('<task>', (model) =>
   generateObject({
     model,
     prompt: builder({ ...params, userIntent, refinement })
   })
)
   ↓ prompt builder
intent-injector.ts
   appendIntentSection(prompt, userIntent, refinement)
```

### 규약

모든 prompt builder 는 호출 직전 `intent-injector.ts` 의 `appendIntentSection()` 으로 다음 두 섹션을 자동 append:

```
[사용자 의도]    ← userIntent 비어있지 않을 때만
- 톤: {tone}
- 타깃: {audience}
- 채널: {channel}
- 추가 요청: {memo}

[보정 지시]      ← refinement 있을 때만
- "{refinement}"
```

### Zod 스키마 추가 필드

모든 generator 라우트의 입력 스키마에 다음 두 옵션 필드 추가:

```typescript
userIntent: z.object({
  tone: z.string().max(20).optional(),
  audience: z.string().max(40).optional(),
  channel: z.string().max(20).optional(),
  memo: z.string().max(200).optional(),
}).optional(),
refinement: z.string().max(300).optional(),
```

### Edge Runtime 영향 없음
intent-injector 는 순수 함수 (외부 API 호출 없음) → 기존 Edge Runtime 라우트 모두 안전.

---

## 13. 변경 이력

| 날짜 | 변경 | 커밋 |
|------|------|------|
| 2026-05-16 | v1.1 Phase 2 — Variants Tray + Lock + 썸네일 Pin · 4K 게이팅 + Trend 편집 + 노션 에디터 | (current) |
| 2026-05-14 | v1.1 UX Customization Phase 1 — 의도 주입 + 분석 편집 + 인라인 편집 + 부분 재생성 | `01b8377` |
| 2026-05-14 | Vercel AI SDK v6 도입 / Edge + SSE 스트리밍 / 멀티 프로바이더 라우터 | `5392ee2` |
| 2026-05-13 | DEV_BYPASS_CREDITS 환경변수 추가 | `6596da5` |
| 2026-05-13 | Nike 디자인 시스템 전면 적용 | `c71ca6a`, `1b49cec` |
