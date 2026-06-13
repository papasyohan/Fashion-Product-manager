# `ai-fittings` 서명 URL 마이그레이션 가이드

> 상태: **계획 / opt-in**. 현재 프로덕션은 public 버킷을 사용하며, 이 문서대로
> 전환하기 전까지 동작이 바뀌지 않습니다. 헬퍼(`src/lib/storage-signed-url.ts`)는
> 존재하지만 **어떤 코드 경로에서도 호출되지 않습니다.**

## 1. 지금 버킷이 public 인 이유

`ai-fittings` (그리고 `product-images`) 버킷은 **의도적으로 public-read** 입니다.

- `supabase/migrations/004_auth_trigger_and_storage.sql`
  - 헤더: "공개 URL 사용 (서명 URL이 아닌 public.url)"
- `supabase/migrations/009_ai_fittings.sql`
  - 노트: "public read 권장", "SELECT: public (서명 URL 보호 불필요한 결과 이미지)"

코드에서 결과 이미지를 `getPublicUrl()` 로 가져와 DB(`ai_fittings.result_url`,
`user_profiles.last_model_image_url`)에 **영구 URL** 로 저장합니다. 예:
`src/app/api/generate/ai-fitting/route.ts` 의 `getPublicUrl('ai-fittings').publicUrl`.

## 2. 그냥 private 으로 바꾸면 깨지는 것

영구 public URL 을 그대로 두고 버킷만 private 으로 전환하면 **저장된 모든 URL 이
즉시 404** 가 됩니다. 구체적으로:

- **공개 공유 페이지** (`/share/...`) — 비로그인 방문자가 보는 fitting/썸네일 이미지.
- **히스토리 썸네일** — `ai_fittings.result_url` 로 렌더되는 목록 이미지.
- **OG 이미지 / 카카오 공유 미리보기** — 크롤러가 인증 없이 가져가야 하는 URL.

즉 단순 토글은 **public 공유 링크를 영구히 깨뜨리므로 절대 한 번에 하지 않습니다.**

## 3. 단계적 마이그레이션 레시피 (권장)

서명 URL 은 만료(expiry)가 있으므로, **읽기 시점에 즉석으로 발급**하는 모델로
바꿔야 합니다. 저장된 영구 서명 URL 은 안티패턴입니다.

1. **경로(path) 저장으로 전환 (선행 작업, 무중단)**
   - 쓰기 사이트에서 `getPublicUrl().publicUrl` 대신 **버킷 내 객체 경로**
     (`<userId>/<ts>.png`)를 DB 에 저장하도록 변경.
   - 기존 행은 `toStoragePath(publicUrl)`(헬퍼 제공) 으로 경로를 역추출해
     백필. 이 단계까지는 버킷이 여전히 public 이라 동작에 변화 없음.

2. **읽기 사이트에서 서명 URL 발급**
   - 이미지를 노출하는 모든 read 경로(공유 페이지, 히스토리, OG)에서
     저장된 경로를 `createAiFittingSignedUrl(path, expiresIn)` 로 변환해 렌더.
   - 공개 공유 페이지는 SSR/route handler 에서 요청마다 새 서명 URL 을 만들어야
     함(만료 처리). 클라이언트에 영구 URL 을 박지 말 것.

3. **버킷 private 전환 + Storage RLS**
   - 1·2 가 전 read 경로에 적용된 뒤에만 버킷을 private 으로 전환:
     ```sql
     update storage.buckets set public = false where id = 'ai-fittings';
     -- INSERT: authenticated 본인 폴더만
     -- SELECT: service-role(서명 발급) + 본인 파일
     ```
   - 서명 발급은 service-role(`createAdminClient`)로 수행하므로 anon SELECT 는 불필요.

4. **만료(expiry) 처리**
   - 공유 페이지: 캐시된 페이지가 만료된 서명 URL 을 들고 있지 않도록
     `expiresIn` 을 페이지 재검증 주기보다 길게 잡거나, 이미지 요청을
     매번 새 서명으로 프록시.
   - OG/크롤러: 만료가 짧으면 미리보기가 깨질 수 있으므로 충분히 길게(예: 7일)
     설정하거나 OG 전용 public 프록시 라우트를 둘 것.

## 4. 헬퍼 API

`src/lib/storage-signed-url.ts`:

```ts
// 객체 경로 → 임시 서명 URL (기본 1시간)
createAiFittingSignedUrl(path: string, expiresInSeconds = 3600)
  : Promise<{ signedUrl: string | null; error: string | null }>

// 기존 public URL → 버킷 내부 경로 (점진 백필용)
toStoragePath(publicUrl: string): string | null
```

두 함수 모두 **현재 호출되지 않으며**, 채택은 위 단계에 따라 점진적으로 진행합니다.
