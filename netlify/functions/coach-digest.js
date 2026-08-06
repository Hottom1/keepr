// Runs weekly. A single weekly cron covers both cadence choices (weekly and
// monthly) — coachDigestDue checks each account's own lastCoachDigestSentAt
// against its own chosen cadence, so a monthly keeper is simply skipped on
// three out of every four runs rather than needing a second scheduled
// function. See DECISIONS.md, "Teammate connections & share with coach" for
// the full design writeup.
//
// Same 30-second execution ceiling and per-user Promise.allSettled fan-out
// as scheduled-alerts.js — see that file's header comment for why.
import { getAllUserRows } from "../lib/supabaseAdmin.js";
import { coachDigestDue, sendCoachDigestForUser } from "../lib/coachDigest.js";

export default async (req) => {
  const rows = await getAllUserRows();
  const due = rows.filter((row) => coachDigestDue((row.data || {}).profile || {}));

  const results = await Promise.allSettled(
    due.map((row) => sendCoachDigestForUser(row.user_id, row.data || {}))
  );
  const sent = results.filter((r) => r.status === "fulfilled" && r.value?.sent).length;
  const failed = results.filter((r) => r.status === "rejected").length;
  console.log(`coach-digest: ${rows.length} accounts, ${due.length} due, ${sent} sent, ${failed} failures`);
  return new Response(null, { status: 202 });
};

export const config = {
  schedule: "@weekly",
};
