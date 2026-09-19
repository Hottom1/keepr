-- Directly-uploaded match video files (AI shot-detection source), as
-- distinct from match.videoUrl (a plain link, used for the manual-review
-- YouTube/Drive/etc. tier). Private Storage bucket + RLS, same
-- auth.uid()-scoped ownership pattern as migration 0002's niggle-files
-- bucket. Run this in the Supabase dashboard's SQL Editor. Safe to re-run.
--
-- IMPORTANT -- this migration alone is not enough for real match videos to
-- upload successfully. Supabase enforces the SMALLER of (a) this bucket's
-- own file_size_limit, set below to 2GB, and (b) the project-wide global
-- upload size limit (Project Settings -> Storage -> Upload file size
-- limit), which defaults to a much smaller value on most plans and cannot
-- be raised from a migration or from application code. That project-wide
-- setting needs raising by hand in the dashboard before a real full-length
-- match video (commonly hundreds of MB to a few GB) can be uploaded.
--
-- Path convention enforced by the app, not the database: every object is
-- stored at {user_id}/{match_id}/{uuid}-{filename}, so checking just the
-- first path segment against auth.uid() is enough to prove ownership.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'match-videos',
  'match-videos',
  false,
  2147483648, -- 2GB
  array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/3gpp']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "read own match videos" on storage.objects;
create policy "read own match videos" on storage.objects
  for select using (
    bucket_id = 'match-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "upload own match videos" on storage.objects;
create policy "upload own match videos" on storage.objects
  for insert with check (
    bucket_id = 'match-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "delete own match videos" on storage.objects;
create policy "delete own match videos" on storage.objects
  for delete using (
    bucket_id = 'match-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
