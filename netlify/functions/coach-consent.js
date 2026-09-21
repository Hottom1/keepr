// The keeper's side of coach consent: ask for the status of their coach's
// address, or send that address an invitation. Authenticated (bearer token), own
// account only. The invitation is the only email Keepr will ever send to an
// address that hasn't confirmed: it contains one confirm link and nothing else.
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { requestCoachInvite, getCoachConsentStatus } from "../lib/supabaseAdmin.js";
import { sendOutboundEmail } from "../lib/sendEmail.js";
import { signCoachUnsubscribeToken } from "../lib/unsubscribeToken.js";
import { parseSingleEmail } from "../../src/lib/kipDomain.js";

const SITE_URL = "https://keepr.coach";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Missing auth token" });
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return json(401, { error: "Unauthorized" });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON body" }); }
  const email = parseSingleEmail(body.email);
  if (!email) return json(400, { error: "That doesn't look like a single valid email address." });

  try {
    if (body.action === "status") {
      return json(200, { status: await getCoachConsentStatus(user.id, email) });
    }
    if (body.action !== "invite") return json(400, { error: "Unknown action" });

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const outcome = await requestCoachInvite(user.id, email, tokenHash);

    if (outcome.result === "confirmed") return json(200, { status: "confirmed" });
    if (outcome.result === "stopped") return json(200, { status: "stopped" });
    if (outcome.result === "too_soon") return json(429, { error: "An invitation was sent a moment ago. Please wait a few minutes before resending." });
    if (outcome.result === "daily_limit") return json(429, { error: "You've reached today's limit for coach invitations. Try again tomorrow." });

    const confirmUrl = `${SITE_URL}/.netlify/functions/coach-confirm?i=${encodeURIComponent(outcome.id)}&t=${rawToken}`;
    const stopUrl = `${SITE_URL}/.netlify/functions/coach-unsubscribe?e=${encodeURIComponent(email.toLowerCase())}&t=${signCoachUnsubscribeToken(email)}`;
    const text = `${user.email} has asked Keepr to send you periodic training updates. Keepr is a training app for handball goalkeepers.

The updates are written from their Keepr profile. They can include their training logs, match stats and attendance, and may also mention injuries or rehab they've logged.

Nothing will be sent to you unless you confirm. To confirm, open this link and press the button on the page:
${confirmUrl}

If you don't want these, do nothing: no updates will be sent. To make sure Keepr never emails this address, use this link:
${stopUrl}`;
    await sendOutboundEmail({ to: email, subject: `Confirm: training updates from ${user.email} on Keepr`, text });
    return json(200, { status: "pending" });
  } catch (e) {
    console.error("coach-consent: failed for", user.id, e.message);
    return json(500, { error: "Something went wrong. Please try again shortly." });
  }
};
