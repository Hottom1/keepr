// Profile's "Send now" button. Unlike coach-digest.js (service-role,
// iterates every account on a schedule), this is a single authenticated
// user acting on their own account only — same bearer-token verification
// pattern as kip-chat.js, so it can't be used to trigger a send for anyone
// else's account.
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "../lib/supabaseAdmin.js";
import { sendCoachDigestForUser } from "../lib/coachDigest.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing auth token" }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { data: row, error: rowError } = await getSupabaseAdmin()
    .from("user_data").select("data").eq("user_id", user.id).maybeSingle();
  if (rowError) {
    return new Response(JSON.stringify({ error: "Couldn't load your data" }), { status: 500 });
  }
  if (!row?.data?.profile?.coachEmail) {
    return new Response(JSON.stringify({ error: "No coach email set" }), { status: 400 });
  }

  try {
    const result = await sendCoachDigestForUser(user.id, row.data);
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-coach-digest-now: failed for", user.id, e.message);
    return new Response(JSON.stringify({ error: "Send failed" }), { status: 500 });
  }
};
