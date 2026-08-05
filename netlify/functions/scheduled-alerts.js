// Runs daily. Reuses computeKipAlerts and buildKipSystemPrompt exactly as
// the in-app alerts feature does — no separate email-specific condition
// logic — filtered by each keeper's own category preferences (Profile's
// "Email alerts" card) and a per-fingerprint cooldown so a condition that's
// been true for days doesn't re-email every single day. See DECISIONS.md,
// "Email infrastructure (ImprovMX)" for the full design writeup, including
// why every write here goes through an atomic RPC rather than a
// fetch-then-write (migration 0003's incident).
//
// Netlify Scheduled Functions have a 30-second execution limit. Every user
// is processed concurrently (Promise.allSettled), not sequentially, so one
// slow account can't crowd out the rest of the run — but this is still a
// real ceiling worth knowing about if the user base grows well past what
// this app runs at today.
import { getAllUserRows, getAllUserEmails, appendEmailAlertLog } from "../lib/supabaseAdmin.js";
import { sendOutboundEmail } from "../lib/sendEmail.js";
import { signUnsubscribeToken } from "../lib/unsubscribeToken.js";
import { computeKipAlerts, describeAlertItem, categoryForAlertType, buildKipSystemPrompt, DEFAULT_EXERCISES } from "../../src/lib/kipDomain.js";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SITE_URL = "https://keepr.coach";
// A condition that's still true after this many days is worth mentioning
// again rather than going silent forever, but re-alerting on literally
// every run (daily) for something unresolved for a week would just be
// noise — this sits between "once and never again" and "every day."
const COOLDOWN_DAYS = 4;

async function callKipDirect(system, userMessage) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 600,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Kip email generation failed");
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}

function withinCooldown(fingerprint, log) {
  const entry = (log || []).find((e) => e.fingerprint === fingerprint);
  if (!entry) return false;
  const ageDays = (Date.now() - new Date(entry.sentAt).getTime()) / (1000 * 60 * 60 * 24);
  return ageDays < COOLDOWN_DAYS;
}

async function processUser(row, emailsById) {
  const userId = row.user_id;
  const data = row.data || {};
  const profile = data.profile || {};
  if (profile.alertsEnabled === false) return null;

  const email = emailsById[userId];
  if (!email) return null;

  const plans = data.plans || [];
  const matches = data.matches || [];
  const adHocSessions = data.adHocSessions || [];
  const season = data.season || "Winter";
  const exercises = [...DEFAULT_EXERCISES, ...(data.customExercises || [])];

  const items = computeKipAlerts({ profile, plans, adHocSessions, matches, season, exercises });
  if (items.length === 0) return null;

  const categories = profile.emailAlertCategories || {};
  const log = profile.emailAlertLog || [];
  const eligible = items.filter((it) => {
    const cat = categoryForAlertType(it.type);
    if (categories[cat] === false) return false;
    if (withinCooldown(it.fingerprint, log)) return false;
    return true;
  });
  if (eligible.length === 0) return null;

  const summary = eligible.map(describeAlertItem).filter(Boolean).join("\n");
  const basePrompt = buildKipSystemPrompt(profile, plans, season, matches, exercises, adHocSessions);
  const unsubUrl = `${SITE_URL}/.netlify/functions/unsubscribe?u=${userId}&t=${signUnsubscribeToken(userId)}`;

  const emailPrompt = `${basePrompt}\n\nEMAIL ALERT CONTEXT:\nYou're writing a short check-in email, not replying in chat — the keeper isn't in the app right now. The following is true right now:\n${summary}\n\nWrite ONE short note in your own voice covering all of the above as a coherent check-in, not a bulleted list — weave them together the way a coach would bring up a few things at once. Lead with whichever matters most. If there's genuinely good news mixed in with a concern, don't bury the good news. Plain text, a few sentences — no subject line, no "Hi [name]" greeting (you don't have their name), no sign-off, just the note itself.`;

  let narrative;
  try {
    narrative = await callKipDirect(emailPrompt, "(Automatic email check-in trigger — write the note described in EMAIL ALERT CONTEXT.)");
  } catch (e) {
    console.error(`scheduled-alerts: Kip generation failed for ${userId}`, e.message);
    return null;
  }
  if (!narrative) return null;

  const text = `${narrative}\n\n—\nUnsubscribe from these emails: ${unsubUrl}`;
  try {
    await sendOutboundEmail({ to: email, subject: "A note from Kip", text });
  } catch (e) {
    console.error(`scheduled-alerts: send failed for ${userId}`, e.message);
    return null;
  }

  try {
    await appendEmailAlertLog(userId, eligible.map((it) => ({ fingerprint: it.fingerprint, sentAt: new Date().toISOString() })));
  } catch (e) {
    console.error(`scheduled-alerts: log update failed for ${userId}`, e.message);
  }

  return { userId, sentCount: eligible.length };
}

export default async (req) => {
  const [rows, emailsById] = await Promise.all([getAllUserRows(), getAllUserEmails()]);
  const results = await Promise.allSettled(rows.map((row) => processUser(row, emailsById)));
  const sent = results.filter((r) => r.status === "fulfilled" && r.value).length;
  const failed = results.filter((r) => r.status === "rejected").length;
  console.log(`scheduled-alerts: processed ${rows.length} accounts, sent ${sent} emails, ${failed} failures`);
  return new Response(null, { status: 202 });
};

export const config = {
  schedule: "@daily",
};
