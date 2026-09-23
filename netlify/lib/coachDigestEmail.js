// The coach digest's HTML rendering, kept separate from coachDigest.js's
// orchestration logic (who's due, rate limits, Kip narrative generation) --
// one file for "what does the email look like," one for "when does it get
// sent and to whom." See "Targeted desktop/tablet support," part 1: this
// used to be plain text only (sendOutboundEmail({ text })) with no layout
// at all, which is what that brief's "give the coach report real desktop
// treatment" was actually asking to fix -- there was no existing visual
// design to extend, so this is a new template, not a breakpoint added to
// one.
//
// Email-safe by construction, not by accident: table-based skeleton
// (flexbox/grid are unreliable in Outlook's Word rendering engine),
// inline styles only (many clients strip <style> blocks), a single
// generous reading column (600px) that scales down cleanly on a phone
// mail client rather than a separate mobile template, and a "bulletproof"
// nested-table bar for the one piece of chart-like visualization (percent
// bars) -- no SVG/canvas, which plenty of clients simply don't render.
// system-ui isn't installed as a real system font on most coaches'
// machines, but every email client falls back gracefully through the
// stack to whatever sans-serif IS available, so it costs nothing to list.
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const INK = "#12213A";
const PAPER = "#F3F2ED";
const TEAL = "#0E8388";
const LINE = "#DAD7CC";
const MUTED = "#68655B";
const RED = "#C1483B";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

// The classic bulletproof HTML-email "bar chart": an outer cell with a flat
// background and an inner cell whose fixed pixel width (not a
// percentage -- percentage widths on table cells are exactly the thing
// Outlook's engine gets wrong) renders the filled portion. `width` is the
// full bar's pixel width in the layout.
function bar(pct, color, width = 220) {
  const filled = Math.max(0, Math.min(100, pct));
  const px = Math.round((filled / 100) * width);
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:${width}px;background:${PAPER};border-radius:4px;"><tr><td style="width:${px}px;height:8px;background:${color};border-radius:4px;font-size:0;line-height:0;">&nbsp;</td><td style="font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

function statTile(value, label, color = INK) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};border-radius:8px;">
      <tr><td style="padding:16px;text-align:center;">
        <div style="font-family:${FONT};font-size:26px;font-weight:800;color:${color};line-height:1.1;">${escapeHtml(value)}</div>
        <div style="font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${MUTED};margin-top:4px;">${escapeHtml(label)}</div>
      </td></tr>
    </table>`;
}

function sectionHeading(text) {
  return `<div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${MUTED};margin:28px 0 14px;padding-top:20px;border-top:1px solid ${LINE};">${escapeHtml(text)}</div>`;
}

function twoTiles(left, right) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="50%" style="padding-right:6px;">${left}</td>
      <td width="50%" style="padding-left:6px;">${right}</td>
    </tr></table>`;
}

function matchStatsSection(matchStats) {
  if (!matchStats) return "";
  const { overallSavePct, totalShots, weakestZones = [], saveTrend = [] } = matchStats;
  if (totalShots === 0 || overallSavePct === null) {
    return `${sectionHeading("Match stats")}<div style="font-family:${FONT};font-size:13px;color:${MUTED};">No shots logged in this window.</div>`;
  }
  const zonesRow = weakestZones.length
    ? `<div style="font-family:${FONT};font-size:12px;color:${MUTED};margin-top:16px;margin-bottom:8px;">Weakest zones</div>` +
      weakestZones.map((z) => `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;"><tr>
          <td style="font-family:${FONT};font-size:13px;color:${INK};width:110px;">${escapeHtml(z.label)}</td>
          <td>${bar(z.savePct, z.savePct < 50 ? RED : TEAL, 180)}</td>
          <td style="font-family:${FONT};font-size:12px;color:${MUTED};text-align:right;width:70px;">${z.savePct}% (${z.shots})</td>
        </tr></table>`).join("")
    : "";
  const trendRows = saveTrend.length
    ? `<div style="font-family:${FONT};font-size:12px;color:${MUTED};margin-top:16px;margin-bottom:8px;">Recent matches</div>` +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">` +
      saveTrend.slice(-6).reverse().map((t) => `
        <tr>
          <td style="font-family:${FONT};font-size:12px;color:${MUTED};padding:5px 0;border-top:1px solid ${LINE};width:70px;">${escapeHtml(formatDate(t.date))}</td>
          <td style="font-family:${FONT};font-size:13px;color:${INK};padding:5px 0;border-top:1px solid ${LINE};">vs ${escapeHtml(t.opponent)}</td>
          <td style="font-family:${FONT};font-size:13px;font-weight:700;color:${t.savePct < 50 ? RED : TEAL};padding:5px 0;border-top:1px solid ${LINE};text-align:right;width:50px;">${t.savePct}%</td>
        </tr>`).join("") +
      `</table>`
    : "";
  return `
    ${sectionHeading("Match stats")}
    ${twoTiles(statTile(`${overallSavePct}%`, "Save rate", TEAL), statTile(totalShots, "Shots faced"))}
    ${zonesRow}
    ${trendRows}`;
}

function trainingSection(trainingLogs) {
  if (!trainingLogs) return "";
  const { completionRate, sessionsCompleted, totalSessionsInPlans, streakWeeks, gymProgress = [] } = trainingLogs;
  const completionText = completionRate !== null ? `${completionRate}%` : "—";
  const gymRows = gymProgress.length
    ? `<div style="font-family:${FONT};font-size:12px;color:${MUTED};margin-top:16px;margin-bottom:8px;">Gym progress</div>` +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">` +
      gymProgress.slice(0, 6).map((g) => `
        <tr>
          <td style="font-family:${FONT};font-size:13px;color:${INK};padding:5px 0;border-top:1px solid ${LINE};">${escapeHtml(g.exercise)}${g.prCount > 0 ? ` <span style="color:${TEAL};font-weight:700;">· ${g.prCount} PR${g.prCount !== 1 ? "s" : ""}</span>` : ""}</td>
          <td style="font-family:${FONT};font-size:12px;color:${MUTED};padding:5px 0;border-top:1px solid ${LINE};text-align:right;white-space:nowrap;">${g.latestTopWeight}kg ${g.trend === "up" ? "↑" : g.trend === "down" ? "↓" : ""}</td>
        </tr>`).join("") +
      `</table>`
    : "";
  return `
    ${sectionHeading("Training")}
    ${twoTiles(
      statTile(completionText, "Sessions completed"),
      statTile(streakWeeks > 0 ? `${streakWeeks}wk` : "—", "Current streak")
    )}
    <div style="font-family:${FONT};font-size:12px;color:${MUTED};margin-top:10px;">${sessionsCompleted} of ${totalSessionsInPlans} planned sessions in this window.</div>
    ${gymRows}`;
}

function attendanceSection(attendance) {
  if (!attendance || attendance.length === 0) return "";
  return `
    ${sectionHeading("Sessions attended")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${attendance.slice(0, 12).map((a) => `
        <tr>
          <td style="font-family:${FONT};font-size:12px;color:${MUTED};padding:5px 0;border-top:1px solid ${LINE};width:70px;">${escapeHtml(formatDate(a.date))}</td>
          <td style="font-family:${FONT};font-size:13px;color:${INK};padding:5px 0;border-top:1px solid ${LINE};">${escapeHtml(a.title)}</td>
        </tr>`).join("")}
    </table>`;
}

export function renderCoachDigestEmailHtml({ reportData, narrative, keeperEmail, unsubUrl }) {
  const { matchStats, trainingLogs, attendance, sinceDate, generatedAt } = reportData;
  const rangeLabel = sinceDate ? `Since ${formatDate(sinceDate)}` : "All-time";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Keepr training update</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;">

<tr><td style="background:${INK};padding:28px 32px;border-radius:12px 12px 0 0;">
  <div style="font-family:${FONT};font-size:22px;font-weight:800;color:#ffffff;">Keepr<span style="color:${TEAL};">.</span></div>
  <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.55);margin-top:10px;">Training update</div>
  <div style="font-family:${FONT};font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px;">${escapeHtml(rangeLabel)}</div>
</td></tr>

<tr><td style="padding:28px 32px 4px;">
  <p style="font-family:${FONT};font-size:15px;line-height:1.65;color:${INK};margin:0;white-space:pre-wrap;">${escapeHtml(narrative)}</p>
</td></tr>

<tr><td style="padding:0 32px;">
  ${matchStatsSection(matchStats)}
  ${trainingSection(trainingLogs)}
  ${attendanceSection(attendance)}
</td></tr>

<tr><td style="padding:24px 32px;">
  <div style="border-top:1px solid ${LINE};padding-top:16px;">
    <p style="font-family:${FONT};font-size:11px;line-height:1.6;color:${MUTED};margin:0;">
      This update was sent from the Keepr account ${escapeHtml(keeperEmail || "of a keeper")}, who listed you as their coach.
      Not expecting it, or don't want these? <a href="${unsubUrl}" style="color:${TEAL};">Stop all Keepr emails to this address</a>.
    </p>
  </div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
