// Stateless signed token — no unsubscribe-token table, no lookup. An
// unsubscribe link is clicked by an unauthenticated browser (whoever's
// reading that inbox), so there's no session to authorize the request;
// the signature itself is what proves "this link really came from an
// email Keepr sent to this account," not a login.
import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.UNSUBSCRIBE_SECRET;

export function signUnsubscribeToken(userId) {
  if (!SECRET) throw new Error("UNSUBSCRIBE_SECRET is not configured");
  return createHmac("sha256", SECRET).update(userId).digest("hex");
}

export function verifyUnsubscribeToken(userId, token) {
  if (!SECRET || !userId || !token) return false;
  const expected = signUnsubscribeToken(userId);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(String(token), "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Same HMAC scheme, but keyed on a coach's email address (lowercased) with a
// "coach:" prefix so a token minted for one purpose can never validate as the
// other. Lets a coach who isn't a Keepr user stop all Keepr coach emails to
// their address from the link in every digest.
export function signCoachUnsubscribeToken(email) {
  if (!SECRET) throw new Error("UNSUBSCRIBE_SECRET is not configured");
  return createHmac("sha256", SECRET).update("coach:" + String(email).toLowerCase().trim()).digest("hex");
}

export function verifyCoachUnsubscribeToken(email, token) {
  if (!SECRET || !email || !token) return false;
  const a = Buffer.from(signCoachUnsubscribeToken(email), "hex");
  const b = Buffer.from(String(token), "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
