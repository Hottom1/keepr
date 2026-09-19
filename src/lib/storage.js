import { supabase } from "./supabaseClient";

export async function loadUserData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_data")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data ? data.data : null;
}

export async function saveUserData(next) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from("user_data")
    .upsert({ user_id: user.id, data: next, updated_at: new Date().toISOString() });

  if (error) throw error;
  return true;
}

const NIGGLE_FILES_BUCKET = "niggle-files";
const MAX_NIGGLE_FILE_BYTES = 10 * 1024 * 1024;

// Path is {user_id}/{niggle_id}/{uuid}-{filename} — the RLS policies on this
// bucket (migration 0002) check only the first segment against auth.uid(),
// so this convention is what makes ownership provable.
export async function uploadNiggleFile(niggleId, file) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const isPdf = file.type === "application/pdf";
  const isImage = file.type.startsWith("image/");
  if (!isPdf && !isImage) throw new Error("Only PDF or image files are supported");
  if (file.size > MAX_NIGGLE_FILE_BYTES) throw new Error("File is too large (10MB max)");

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${user.id}/${niggleId}/${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage.from(NIGGLE_FILES_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;

  return { path, name: file.name, mimeType: file.type, size: file.size, uploadedAt: new Date().toISOString() };
}

// Same bucket/RLS as uploadNiggleFile — the policies only check the first
// path segment against auth.uid(), so a "general" second segment (instead of
// a niggle id) needs no new bucket or migration.
export async function uploadGeneralFile(file) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const isPdf = file.type === "application/pdf";
  const isImage = file.type.startsWith("image/");
  if (!isPdf && !isImage) throw new Error("Only PDF or image files are supported");
  if (file.size > MAX_NIGGLE_FILE_BYTES) throw new Error("File is too large (10MB max)");

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${user.id}/general/${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage.from(NIGGLE_FILES_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;

  return { path, name: file.name, mimeType: file.type, size: file.size, uploadedAt: new Date().toISOString() };
}

// Bucket is private — this is the only way to actually view/download a
// file. Short-lived on purpose; call fresh each time rather than caching.
export async function getSignedNiggleFileUrl(path, expiresInSeconds = 300) {
  const { data, error } = await supabase.storage.from(NIGGLE_FILES_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteNiggleFile(path) {
  const { error } = await supabase.storage.from(NIGGLE_FILES_BUCKET).remove([path]);
  if (error) throw error;
  return true;
}

// Directly-uploaded match video (AI shot-detection source) -- a separate
// bucket from niggle-files since these are much larger. The bucket's own
// file_size_limit is 2GB (migration 0007), but Supabase also enforces the
// project-wide global upload limit underneath that, which needs raising by
// hand in the Supabase dashboard (Storage settings) before a real
// full-length match video will actually fit -- this function can't do
// anything about that ceiling itself.
const MATCH_VIDEOS_BUCKET = "match-videos";
const MAX_MATCH_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v", "video/3gpp"];

// Path is {user_id}/{match_id}/{uuid}-{filename}, same ownership convention
// as uploadNiggleFile -- RLS (migration 0007) checks only the first segment.
export async function uploadMatchVideo(matchId, file) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) throw new Error("That file type isn't supported -- try MP4, MOV, or WebM.");
  if (file.size > MAX_MATCH_VIDEO_BYTES) throw new Error("File is too large (2GB max).");

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${user.id}/${matchId}/${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage.from(MATCH_VIDEOS_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;

  return { path, name: file.name, mimeType: file.type, size: file.size, uploadedAt: new Date().toISOString() };
}

// Bucket is private -- same short-lived-signed-URL pattern as niggle files.
// A longer default than niggle files' 300s since this URL also needs to
// stay valid for the length of the browser-side frame-extraction pass, not
// just a single view/download.
export async function getSignedMatchVideoUrl(path, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage.from(MATCH_VIDEOS_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteMatchVideo(path) {
  const { error } = await supabase.storage.from(MATCH_VIDEOS_BUCKET).remove([path]);
  if (error) throw error;
  return true;
}
