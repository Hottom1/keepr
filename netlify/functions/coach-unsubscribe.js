// Public, unauthenticated by design: it's reached from the link in a coach
// digest by someone who isn't a Keepr user. The signed token (see
// netlify/lib/unsubscribeToken.js) is what proves the link came from a Keepr
// email to that address. Adds the address to a suppression list checked before
// every coach digest, so it stops all Keepr coach emails to it, from any
// account, not just the one that sent this one.
import { suppressCoachEmail } from "../lib/supabaseAdmin.js";
import { verifyCoachUnsubscribeToken } from "../lib/unsubscribeToken.js";

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
  const email = url.searchParams.get("e");
  const token = url.searchParams.get("t");

  if (!verifyCoachUnsubscribeToken(email, token)) {
    return new Response(page("Link not valid", "This link is invalid or incomplete. If you're trying to stop Keepr emails, reply to the email you received or contact privacy@keepr.coach and we'll do it for you."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    await suppressCoachEmail(email);
  } catch (e) {
    console.error("coach-unsubscribe: failed to record suppression", e.message);
    return new Response(page("Something went wrong", "Couldn't process this just now. Please try again in a moment, or contact privacy@keepr.coach and we'll do it for you."), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }

  return new Response(page("You're unsubscribed", "Keepr won't send any more coach updates to this address. If a keeper adds you again, nothing will be sent."), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
};
