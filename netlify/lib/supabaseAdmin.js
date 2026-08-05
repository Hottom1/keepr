// Service-role Supabase client — bypasses RLS entirely, so it can read and
// write every user's row, not just one signed-in user's own. Only used by
// server-side code that has no logged-in user to scope a request to: the
// inbound-email webhook (matching an alias to whichever account owns it)
// and the scheduled alerts job (iterating every account). Never imported by
// anything reachable from the client bundle — importing this file at all
// requires SUPABASE_SERVICE_ROLE_KEY, which only exists in the server
// environment, never in VITE_-prefixed client env vars.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client = null;
export function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Supabase service role is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)");
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}

// user_data holds one JSONB blob per user (see src/lib/storage.js for the
// client-side equivalent, which is scoped to auth.uid() via RLS instead).
export async function getAllUserRows() {
  const { data, error } = await getSupabaseAdmin().from("user_data").select("user_id, data");
  if (error) throw error;
  return data || [];
}

export async function getUserRowById(userId) {
  const { data, error } = await getSupabaseAdmin().from("user_data").select("user_id, data").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveUserRowById(userId, nextData) {
  const { error } = await getSupabaseAdmin().from("user_data").update({ data: nextData, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (error) throw error;
}

// inboundAlias lives at profile.inboundAlias (Profile owns it, alongside
// the rest of a keeper's account-level settings) — not a top-level field of
// the data blob, so the JSON path has to traverse through "profile" first.
export async function findUserRowByInboundAlias(alias) {
  const { data, error } = await getSupabaseAdmin()
    .from("user_data")
    .select("user_id, data")
    .eq("data->profile->>inboundAlias", alias)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUserEmailById(userId) {
  const { data, error } = await getSupabaseAdmin().auth.admin.getUserById(userId);
  if (error) throw error;
  return data?.user?.email || null;
}
