-- Sprint 1 회원가입 안정화 + 이미지 업로드 인프라
--
-- 1) 회원가입 시 user_profiles 자동 생성 트리거
--    - auth.users INSERT 시 동일 id로 user_profiles 행 자동 생성
--    - 누락 시 /billing, credit-guard 등에서 user_profiles row 조회 실패
--
-- 2) Storage 버킷 'product-images' 생성 (Public)
--    - 업로드된 제품 사진 + Nano Banana 2 생성 썸네일 저장
--    - 공개 URL 사용 (서명 URL이 아닌 public.url)

-- ─── 1. user_profiles 자동 생성 함수 + 트리거 ───────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, plan, credits_left)
  values (new.id, 'free', 3)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 기존에 가입했지만 user_profiles 행이 없는 사용자 백필
insert into public.user_profiles (id, plan, credits_left)
select u.id, 'free', 3
from auth.users u
left join public.user_profiles p on p.id = u.id
where p.id is null;

-- ─── 2. Storage 버킷 'product-images' (Public) ─────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  20971520, -- 20MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 버킷 RLS 정책: 인증된 사용자는 자기 폴더에만 업로드, 모두 공개 읽기
drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "product_images_user_insert" on storage.objects;
create policy "product_images_user_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
  );

drop policy if exists "product_images_user_update" on storage.objects;
create policy "product_images_user_update"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and auth.uid() = owner
  );

drop policy if exists "product_images_user_delete" on storage.objects;
create policy "product_images_user_delete"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and auth.uid() = owner
  );
