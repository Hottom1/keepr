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
    const result = await sendCoachDigestForUser(user.id, row.data, { mode: "manual" });
    if (result.skipped) {
      const refusals = {
        unconfirmed: [409, "Your coach hasn't confirmed yet. Ask them to open the email we sent (you can resend it from Share with coach)."],
        invalid_email: [400, "That doesn't look like a single valid email address. Check your coach's address in Share with coach."],
        suppressed: [409, "Your coach has asked not to receive Keepr emails, so nothing was sent."],
        too_soon: [429, "You just sent one. Please wait a few minutes before sending again."],
        daily_limit: [429, "You've reached today's limit for coach updates. Try again tomorrow."],
        no_coach_email: [400, "No coach email set"],
      };
      const [status, message] = refusals[result.skipped] || [400, "Nothing was sent"];
      return new Response(JSON.stringify({ error: message }), { status, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-coach-digest-now: failed for", user.id, e.message);
    return new Response(JSON.stringify({ error: "Send failed" }), { status: 500 });
  }
};
