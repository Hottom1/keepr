// Public, unauthenticated by design — reached by clicking a link in an
// email, not by being logged in. The signed token (see
// netlify/lib/unsubscribeToken.js) is what proves the request is
// legitimate, not a session. Turns off the same profile.alertsEnabled
// switch the in-app toggle and Profile's "Email alerts" card already
// write to — one master switch, not a second one this link manages
// independently.
import { setAlertsEnabled } from "../lib/supabaseAdmin.js";
import { verifyUnsubscribeToken } from "../lib/unsubscribeToken.js";

function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #F3F2ED; color: #12213A; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; }
    .card { background: #fff; border-radius: 12px; padding: 32px; max-width: 420px; text-align: center; border: 1px solid #DAD7CC; }
    h1 { font-size: 20px; margin: 0 0 12px; }
    p { font-size: 14px; color: #555; line-height: 1.5; }
  </style>
  </head><body><div class="card"><h1>${title}</h1><p>${body}</p></div></body></html>`;
}

export default async (req) => {
  const url = new URL(req.url);
  const userId = url.searchParams.get("u");
  const token = url.searchParams.get("t");

  if (!verifyUnsubscribeToken(userId, token)) {
    return new Response(page("Link not valid", "This unsubscribe link is invalid or has expired. If you're trying to stop Kip's emails, you can also turn off Email alerts from Profile in the app."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    await setAlertsEnabled(userId, false);
  } catch (e) {
    console.error("unsubscribe: failed to update alertsEnabled", e.message);
    return new Response(page("Something went wrong", "Couldn't process this just now — try again in a moment, or turn off Email alerts from Profile in the app."), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }

  return new Response(page("You're unsubscribed", "Kip's email alerts are now off for this account. You can turn them back on any time from Profile in the app."), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
};
