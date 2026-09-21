import { supabase } from "./supabaseClient";

// Talks to netlify/functions/coach-consent.js. Consent lives on the server,
// keyed by this keeper and the coach's address, not in the profile: the
// keeper can ask for the status or send an invitation, but only the coach can
// confirm. Resolves to "none" | "pending" | "confirmed" | "stopped".
export async function coachConsent(action, email) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch("/.netlify/functions/coach-consent", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify({ action, email }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(body.error || "Request failed");
    err.userFacing = [400, 429].includes(response.status) && !!body.error;
    throw err;
  }
  return body.status;
}
