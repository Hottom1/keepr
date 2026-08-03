-- PT/physio file uploads attached to niggles: private Storage bucket + RLS.
-- Run this in the Supabase dashboard's SQL Editor (Project -> SQL Editor -> New query).
-- Safe to re-run.
--
-- The bucket is private (no public access at all). Every view/download goes
-- through a short-lived signed URL generated client-side per request; RLS
-- below is what actually enforces "only your own files" — the same
-- auth.uid()-scoped ownership pattern as migration 0001's user_data table.
--
-- Path convention enforced by the app, not the database: every object is
-- stored at {user_id}/{niggle_id}/{uuid}-{filename}, so checking just the
-- first path segment against auth.uid() is enough to prove ownership.

insert into storage.buckets (id, name, public)
values ('niggle-files', 'niggle-files', false)
on conflict (id) do nothing;

drop policy if exists "read own niggle files" on storage.objects;
create policy "read own niggle files" on storage.objects
  for select using (
    bucket_id = 'niggle-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "upload own niggle files" on storage.objects;
create policy "upload own niggle files" on storage.objects
  for insert with check (
    bucket_id = 'niggle-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "delete own niggle files" on storage.objects;
create policy "delete own niggle files" on storage.objects
  for delete using (
    bucket_id = 'niggle-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
