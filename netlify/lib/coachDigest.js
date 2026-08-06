// Shared by both netlify/functions/coach-digest.js (the weekly scheduled
// job, which fans this out across every account) and
// netlify/functions/send-coach-digest-now.js (the Profile "Send now"
// button, one account at a time) — one implementation of "what does a
// coach digest contain and how does it get sent," not two copies that
// could drift.
import { sendOutboundEmail } from "./sendEmail.js";
import { callKipDirect } from "./callKipDirect.js";
import { appendReport, setLastCoachDigestSentAt } from "./supabaseAdmin.js";
import { computeCoachReportData, buildKipSystemPrompt, DEFAULT_EXERCISES, uid } from "../../src/lib/kipDomain.js";

const DEFAULT_CATEGORIES = { trainingLogs: true, matchStats: true, attendance: true };

function cadenceDays(profile) {
  return (profile.coachDigestCadence || "weekly") === "monthly" ? 30 : 7;
}

// True once a cadence period has actually elapsed since the last send (or
// immediately, if a digest has never gone out) — used by the scheduled job
// to decide who's due on a given weekly run; "Send now" bypasses this
// entirely since it's an explicit keeper action, not a cadence check.
export function coachDigestDue(profile) {
  if (!profile?.coachEmail) return false;
  if (!profile.lastCoachDigestSentAt) return true;
  const ageDays = (Date.now() - new Date(profile.lastCoachDigestSentAt).getTime()) / (1000 * 60 * 60 * 24);
  return ageDays >= cadenceDays(profile);
}

// The reporting window's start date — since the last digest, or one
// cadence period back if none has ever been sent — so a weekly digest
// covers the last week's activity, not the keeper's entire history repeated
// every send.
function windowStartDate(profile) {
  const base = profile.lastCoachDigestSentAt
    ? new Date(profile.lastCoachDigestSentAt)
    : new Date(Date.now() - cadenceDays(profile) * 24 * 60 * 60 * 1000);
  return base.toISOString().slice(0, 10);
}

// Returns { sent: true } on success, { skipped: reason } if there's nothing
// to send (no coach email configured). Throws on a real failure (Kip
// generation or the send itself) — callers decide how to handle that
// per-user without one failure taking down the whole scheduled run.
export async function sendCoachDigestForUser(userId, data) {
  const profile = data.profile || {};
  if (!profile.coachEmail) return { skipped: "no coach email configured" };

  const plans = data.plans || [];
  const matches = data.matches || [];
  const adHocSessions = data.adHocSessions || [];
  const season = data.season || "Winter";
  const exercises = [...DEFAULT_EXERCISES, ...(data.customExercises || [])];
  const categories = profile.coachShareCategories || DEFAULT_CATEGORIES;
  const sinceDate = windowStartDate(profile);

  const reportData = computeCoachReportData({ matches, plans, adHocSessions, exercises, season, categories, sinceDate });

  const basePrompt = buildKipSystemPrompt(profile, plans, season, matches, exercises, adHocSessions);
  const prompt = `${basePrompt}\n\nCOACH DIGEST CONTEXT:\nYou're writing a short update for this keeper's COACH, not the keeper themselves — a different audience. Keep it plain and professional, third person, no chatty tone and no direct address to the keeper. The keeper chose what's included below (some sections may be entirely absent — that's their choice, don't remark on what's missing, just cover what's actually there):\n${JSON.stringify(reportData, null, 2)}\n\nWrite a few short plain paragraphs a coach could skim in under a minute. No headers, no bullet list of raw numbers — narrate it. If there's genuinely nothing worth reporting in this window, say that plainly in one line rather than padding it out.`;

  const narrative = await callKipDirect(prompt, "(Coach digest trigger — write the update described in COACH DIGEST CONTEXT.)");

  await sendOutboundEmail({ to: profile.coachEmail, subject: "Keepr training update", text: narrative });

  const report = {
    id: uid(),
    createdAt: new Date().toISOString(),
    season,
    data: reportData,
    narrative,
    sentToCoach: true,
    coachEmail: profile.coachEmail,
  };
  await appendReport(userId, report);
  await setLastCoachDigestSentAt(userId, new Date().toISOString());

  return { sent: true };
}
