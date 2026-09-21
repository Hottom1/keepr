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

// Appends via a single atomic SQL statement (supabase/migrations/0003) —
// never a fetch-then-write of the whole blob. Two overlapping webhook
// invocations for the same user (plausible whenever a keeper forwards more
// than one email close together) raced on exactly that pattern in real
// testing and silently reverted unrelated profile fields the losing write
// never even knew about. See DECISIONS.md, "Email infrastructure
// (ImprovMX)" for the full incident.
export async function appendPendingCalendarSuggestion(userId, suggestion) {
  const { error } = await getSupabaseAdmin().rpc("append_pending_calendar_suggestion", { p_user_id: userId, p_suggestion: suggestion });
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

// Pages through listUsers() instead of trusting a single call: Supabase's
// admin API returns one page at a time (50 by default), so with more accounts
// than that everyone past the first page silently never got an email from the
// scheduled jobs. One paginated sweep is still far cheaper than N
// getUserById() calls.
export async function getAllUserEmails() {
  const map = {};
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await getSupabaseAdmin().auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const u of data.users) map[u.id] = u.email;
    if (data.users.length < perPage) break;
  }
  return map;
}

// Same atomic-append discipline as appendPendingCalendarSuggestion — see
// supabase/migrations/0004_email_alert_atomics.sql.
export async function appendEmailAlertLog(userId, entries) {
  const { error } = await getSupabaseAdmin().rpc("append_email_alert_log", { p_user_id: userId, p_entries: entries });
  if (error) throw error;
}

export async function setAlertsEnabled(userId, enabled) {
  const { error } = await getSupabaseAdmin().rpc("set_alerts_enabled", { p_user_id: userId, p_enabled: enabled });
  if (error) throw error;
}

// Same atomic-append discipline as appendPendingCalendarSuggestion/
// appendEmailAlertLog — see supabase/migrations/0006_coach_digest_atomics.sql.
export async function appendReport(userId, report) {
  const { error } = await getSupabaseAdmin().rpc("append_report", { p_user_id: userId, p_report: report });
  if (error) throw error;
}

export async function setLastCoachDigestSentAt(userId, sentAtIso) {
  const { error } = await getSupabaseAdmin().rpc("set_last_coach_digest_sent", { p_user_id: userId, p_sent_at: sentAtIso });
  if (error) throw error;
}

// Server-owned counters and opt-outs from migration 0010. Deliberately not
// stored in the user's own blob: anything in user_data.data is writable by its
// owner, so a limit kept there could be reset by editing it.
export async function consumeKipQuota(userId, textChars, maxCalls, maxChars) {
  const { data, error } = await getSupabaseAdmin().rpc("consume_kip_quota", {
    p_user_id: userId, p_text_chars: textChars, p_max_calls: maxCalls, p_max_chars: maxChars,
  });
  if (error) throw error;
  return data === true;
}

// Returns "ok" (and records the send), or "suppressed" / "too_soon" / "daily_limit".
export async function reserveCoachDigestSend(userId, coachEmail, minGap, maxPerDay) {
  const { data, error } = await getSupabaseAdmin().rpc("reserve_coach_digest_send", {
    p_user_id: userId, p_coach_email: coachEmail, p_min_gap: minGap, p_max_per_day: maxPerDay,
  });
  if (error) throw error;
  return data;
}

export async function suppressCoachEmail(email) {
  const { error } = await getSupabaseAdmin().rpc("suppress_coach_email", { p_email: email });
  if (error) throw error;
}

// Coach consent (migration 0013). tokenHash is the sha256 of a random token that
// only ever appears in the emailed link; the database never sees the token.
export async function requestCoachInvite(userId, coachEmail, tokenHash) {
  const { data, error } = await getSupabaseAdmin().rpc("request_coach_invite", { p_user_id: userId, p_coach_email: coachEmail, p_token_hash: tokenHash });
  if (error) throw error;
  return data;
}

export async function confirmCoachInvite(id, tokenHash) {
  const { data, error } = await getSupabaseAdmin().rpc("confirm_coach_invite", { p_id: id, p_token_hash: tokenHash });
  if (error) throw error;
  return data === true;
}

// "none" | "pending" | "confirmed" | "stopped"
export async function getCoachConsentStatus(userId, coachEmail) {
  const { data, error } = await getSupabaseAdmin().rpc("get_coach_consent_status", { p_user_id: userId, p_coach_email: coachEmail });
  if (error) throw error;
  return data;
}
