-- Security audit D8 / E3: a per-account storage cap. Run in the Supabase
-- dashboard SQL Editor: click into the editor, press Cmd+A, paste over it,
-- check the first line reads "-- Security audit D8", then Run. Safe to re-run.
--
-- Buckets limit the size of ONE file (niggle-files 10MB; match-videos 10GB) but
-- nothing limited how many files one account could store, so with open signup
-- a single account could fill storage. Uploads are now refused once the account
-- already holds its quota across both buckets. The check happens before an
-- upload, so an account can overshoot by at most one file (bounded by the
-- per-file limit).
--
-- The cap is a row you can change without a migration:
--   update public.app_limits set value = 53687091200 where key = 'storage_bytes_per_user';  -- 50 GB
-- Default below is 25 GB, room for several full-length match videos. The row is
-- readable only by the service role.

create table if not exists public.app_limits (
  key text primary key,
  value bigint not null
);
alter table public.app_limits enable row level security;
revoke all on table public.app_limits from anon, authenticated;
insert into public.app_limits (key, value) values ('storage_bytes_per_user', 26843545600) on conflict (key) do nothing;

-- Total bytes the signed-in user currently stores in the two buckets. Runs as
-- its owner so it can read storage.objects; it takes no argument and only ever
-- looks at the caller's own folder, so it can't be used to probe anyone else.
create or replace function public.storage_within_quota()
returns boolean
language sql stable security definer set search_path = public, storage as $$
  select coalesce((
    select sum((o.metadata->>'size')::bigint)
    from storage.objects o
    where o.bucket_id in ('niggle-files', 'match-videos')
      and o.name like auth.uid()::text || '/%'
  ), 0) < (select value from public.app_limits where key = 'storage_bytes_per_user');
$$;

revoke execute on function public.storage_within_quota() from public, anon;
grant execute on function public.storage_within_quota() to authenticated;

drop policy if exists "upload own niggle files" on storage.objects;
create policy "upload own niggle files" on storage.objects
  for insert with check (
    bucket_id = 'niggle-files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.storage_within_quota()
  );

drop policy if exists "upload own match videos" on storage.objects;
create policy "upload own match videos" on storage.objects
  for insert with check (
    bucket_id = 'match-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.storage_within_quota()
  );
