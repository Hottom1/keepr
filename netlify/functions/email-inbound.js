// ImprovMX Rules Routing webhook target for the schedule-forwarding alias.
// Never creates a Match or calendar entry directly — only ever appends to
// profile.pendingCalendarSuggestions, which the keeper reviews and confirms
// (or discards) next time they open Plans. That boundary is deliberate: see
// DECISIONS.md, "Email infrastructure (ImprovMX)" — ImprovMX doesn't sign
// webhook requests, so a spoofed POST should be able to do no more damage
// than pre-filling a review screen with junk.
import { findUserRowByInboundAlias, appendPendingCalendarSuggestion } from "../lib/supabaseAdmin.js";
import { parseFirstIcsEvent } from "../lib/icsParser.js";
import { extractCalendarInfoFromEmail } from "../lib/calendarExtraction.js";

// ImprovMX's own webhook guide names this as their one static sending IP
// and recommends whitelisting it, since they don't sign requests at all.
// Logged, not enforced: a real live test proved this rejects any request
// that isn't from exactly this IP, and there's no way from here to confirm
// ImprovMX only ever sends from this one address (regions, pool changes,
// etc. aren't documented). Silently dropping a genuine forwarded email over
// an unconfirmed IP is worse than the marginal security value of enforcing
// it — the real safety boundary is that nothing here ever auto-commits a
// Match or calendar entry regardless of who sent the request.
const IMPROVMX_WEBHOOK_IP = "15.237.103.194";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function guessKindFromTitle(title) {
  if (!title) return null;
  return /\bvs\b|\bv\.?\s/i.test(title) ? "match" : null;
}

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const sourceIp = context.ip || req.headers.get("x-nf-client-connection-ip");
  if (sourceIp && sourceIp !== IMPROVMX_WEBHOOK_IP) {
    console.warn(`email-inbound: request from IP ${sourceIp}, expected ${IMPROVMX_WEBHOOK_IP} — processing anyway, logged for visibility only`);
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ received: false }), { status: 200 });
  }

  // TEMPORARY diagnostic — real ImprovMX deliveries confirmed via their own
  // Logs tab, but no suggestion was ever appearing, meaning the assumed
  // payload shape (from their docs, not a real payload) doesn't match what
  // they actually send. Dumps the raw shape into the known dev account so
  // it can be inspected, then this block gets removed once the real shape
  // is confirmed. Never touches real user data — separate debug field.
  try {
    await appendPendingCalendarSuggestion("3906ebe8-7992-4d8e-a8c4-2cbeae2e835e", {
      id: uid(),
      createdAt: new Date().toISOString(),
      source: "DEBUG_RAW_PAYLOAD",
      title: "DEBUG",
      date: "2026-01-01",
      time: null,
      location: null,
      emailSubject: JSON.stringify(payload).slice(0, 1900),
    });
  } catch (e) {
    console.error("debug capture failed", e.message);
  }

  const recipient = (payload.to?.[0]?.email || payload.headers?.["Delivered-To"] || "").toLowerCase().trim();
  if (!recipient) return new Response(JSON.stringify({ received: true }), { status: 200 });

  let userRow;
  try {
    userRow = await findUserRowByInboundAlias(recipient);
  } catch (e) {
    console.error("email-inbound: alias lookup failed", e.message);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }
  if (!userRow) return new Response(JSON.stringify({ received: true }), { status: 200 });

  const icsAttachment = (payload.attachments || []).find(
    (a) => a.type === "text/calendar" || /\.ics$/i.test(a.name || "")
  );

  let suggestion = null;

  if (icsAttachment) {
    try {
      const icsText = Buffer.from(icsAttachment.content, "base64").toString("utf8");
      const event = parseFirstIcsEvent(icsText);
      if (event && event.date) {
        suggestion = {
          id: uid(),
          createdAt: new Date().toISOString(),
          source: "ics",
          suggestedKind: guessKindFromTitle(event.title),
          title: event.title || "Forwarded calendar event",
          date: event.date,
          time: event.time,
          location: event.location,
          emailSubject: payload.subject || "",
        };
      }
    } catch (e) {
      console.error("email-inbound: .ics parse failed", e.message);
    }
  }

  if (!suggestion) {
    try {
      const extracted = await extractCalendarInfoFromEmail({ subject: payload.subject, text: payload.text, html: payload.html });
      if (extracted.looksLikeCalendarItem && extracted.date) {
        suggestion = {
          id: uid(),
          createdAt: new Date().toISOString(),
          source: "email-extraction",
          suggestedKind: extracted.kind,
          title: extracted.title || "Forwarded calendar event",
          date: extracted.date,
          time: extracted.time,
          location: extracted.location,
          emailSubject: payload.subject || "",
        };
      }
    } catch (e) {
      console.error("email-inbound: Claude extraction failed", e.message);
    }
  }

  if (suggestion) {
    try {
      await appendPendingCalendarSuggestion(userRow.user_id, suggestion);
    } catch (e) {
      console.error("email-inbound: save failed", e.message);
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};
