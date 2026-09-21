// The coach's confirmation page, opened from the emailed link. Public by design
// (the coach isn't a Keepr user); the random token in the link is the credential.
// GET only shows a page with a button, and consent is recorded by the POST that
// button sends. That way a mail scanner or link-preview bot that merely fetches
// the URL can never "confirm" on the coach's behalf.
import { createHash } from "node:crypto";
import { confirmCoachInvite } from "../lib/supabaseAdmin.js";

const ID_PATTERN = /^[0-9a-f-]{36}$/i;
const TOKEN_PATTERN = /^[0-9a-f]{64}$/i;

function page(title, body, extra = "") {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #F3F2ED; color: #12213A; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; }
    .card { background: #fff; border-radius: 12px; padding: 32px; max-width: 440px; text-align: center; border: 1px solid #DAD7CC; }
    h1 { font-size: 20px; margin: 0 0 12px; }
    p { font-size: 14px; color: #555; line-height: 1.5; }
    button { background: #0E8388; color: #fff; border: 0; border-radius: 8px; padding: 12px 20px; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 8px; }
  </style>
  </head><body><div class="card"><h1>${title}</h1><p>${body}</p>${extra}</div></body></html>`;
}

const html = (status, content) => new Response(content, { status, headers: { "Content-Type": "text/html" } });

export default async (req) => {
  const url = new URL(req.url);
  let id = url.searchParams.get("i");
  let token = url.searchParams.get("t");

  if (req.method === "POST") {
    const form = new URLSearchParams(await req.text());
    id = form.get("i");
    token = form.get("t");
  } else if (req.method !== "GET") {
    return html(405, page("Not allowed", "That request isn't supported."));
  }

  if (!ID_PATTERN.test(id || "") || !TOKEN_PATTERN.test(token || "")) {
    return html(400, page("Link not valid", "This confirmation link is invalid or incomplete. Ask the person who invited you to send a fresh invitation from Keepr."));
  }

  if (req.method === "GET") {
    const form = `<form method="POST" action="/.netlify/functions/coach-confirm"><input type="hidden" name="i" value="${id}"><input type="hidden" name="t" value="${token}"><button type="submit">Yes, send me updates</button></form>`;
    return html(200, page("Confirm training updates", "A Keepr user has asked to send you periodic training updates by email. Press the button to confirm. If you don't want them, close this page and nothing will be sent.", form));
  }

  try {
    const ok = await confirmCoachInvite(id, createHash("sha256").update(token).digest("hex"));
    if (!ok) return html(400, page("Link not valid", "This confirmation link is invalid, has been replaced by a newer invitation, or this address has opted out of Keepr emails."));
  } catch (e) {
    console.error("coach-confirm: failed", e.message);
    return html(500, page("Something went wrong", "Couldn't record your confirmation just now. Please try again in a moment."));
  }
  return html(200, page("You're confirmed", "Thanks. Keepr will now send you their updates. Every update includes a link to stop all Keepr emails to this address whenever you like."));
};
