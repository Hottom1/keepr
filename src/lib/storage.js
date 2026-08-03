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
