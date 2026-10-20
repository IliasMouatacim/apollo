-- Every Apollo account can access only its own song rows and media objects.
-- Run this migration with the Supabase CLI or in the Supabase SQL editor.

-- Bring older Apollo schemas up to the fields used by the application.
alter table public.songs add column if not exists user_id text;
alter table public.songs add column if not exists user_email text;
alter table public.songs add column if not exists is_liked boolean not null default false;
alter table public.songs add column if not exists plays integer not null default 0;
alter table public.songs add column if not exists genre text;

-- Attach legacy rows to an existing auth account when their email matches.
update public.songs as song
set user_id = auth_user.id::text
from auth.users as auth_user
where song.user_id is null
  and song.user_email is not null
  and lower(song.user_email) = lower(auth_user.email);

-- Apollo's legacy schema predated ownership columns. Those existing tracks
-- were uploaded for the original owner account, so preserve them there.
update public.songs as song
set user_id = auth_user.id::text,
    user_email = auth_user.email
from auth.users as auth_user
where song.user_id is null
  and lower(auth_user.email) = 'ilias.mouatacim@gmail.com';

alter table public.songs alter column user_id set default auth.uid()::text;
alter table public.songs alter column user_id set not null;

-- Store object paths rather than permanent public URLs. The client creates
-- short-lived signed URLs after the authenticated row query succeeds.
update public.songs
set url = regexp_replace(url, '^https?://[^/]+/storage/v1/object/public/media/', '')
where url like 'http%/storage/v1/object/public/media/%';

update public.songs
set cover_url = regexp_replace(cover_url, '^https?://[^/]+/storage/v1/object/public/media/', '')
where cover_url like 'http%/storage/v1/object/public/media/%';

alter table public.songs enable row level security;
alter table public.songs force row level security;

-- Remove legacy policies on this table so a permissive public policy cannot
-- override the private policies below.
do $$
declare policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'songs'
  loop
    execute format('drop policy if exists %I on public.songs', policy_row.policyname);
  end loop;
end $$;

create policy "Users can read their own songs"
on public.songs for select
to authenticated
using (user_id::text = auth.uid()::text);

create policy "Users can add their own songs"
on public.songs for insert
to authenticated
with check (user_id::text = auth.uid()::text);

create policy "Users can update their own songs"
on public.songs for update
to authenticated
using (user_id::text = auth.uid()::text)
with check (user_id::text = auth.uid()::text);

create policy "Users can delete their own songs"
on public.songs for delete
to authenticated
using (user_id::text = auth.uid()::text);

-- The media bucket must be private. A public bucket bypasses signed URLs.
update storage.buckets set public = false where id = 'media';

-- Remove prior media-specific policies. Policies for unrelated buckets stay.
do $$
declare policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        coalesce(qual, '') ilike '%media%'
        or coalesce(with_check, '') ilike '%media%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', policy_row.policyname);
  end loop;
end $$;

create policy "Users can read their own Apollo media"
on storage.objects for select
to authenticated
using (
  bucket_id = 'media'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.songs
      where public.songs.user_id::text = auth.uid()::text
        and (public.songs.url = name or public.songs.cover_url = name)
    )
  )
);

create policy "Users can upload their own Apollo media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update their own Apollo media"
on storage.objects for update
to authenticated
using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own Apollo media"
on storage.objects for delete
to authenticated
using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
