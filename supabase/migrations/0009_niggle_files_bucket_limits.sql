-- Security fix (audit finding E3). Run in the Supabase dashboard SQL Editor.
-- Safe to re-run.
--
-- niggle-files (PT/physio plans, rehab files, "general" uploads) had no
-- server-side size or type limit: the 10MB / PDF-or-image rule lived only in
-- src/lib/storage.js, so anyone with an account could upload arbitrary types
-- and sizes straight to the Storage API (verified: an 11MB text/html file, an
-- .exe, and a 12MB blob were all accepted). It also silently inherited the
-- project-wide upload limit, which was raised to 10GB for match video.
--
-- This sets the same limits the client already enforces at the bucket, where
-- they can't be bypassed. Only affects new uploads; existing objects are
-- untouched. The MIME list mirrors src/lib/storage.js (ALLOWED_NIGGLE_FILE_TYPES).
--
-- Not changed here: match-videos keeps whatever file_size_limit it currently
-- has in the dashboard (10GB was set deliberately for full-length matches).

update storage.buckets
set file_size_limit = 10485760,  -- 10 MB
    allowed_mime_types = array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif'
    ]
where id = 'niggle-files';
