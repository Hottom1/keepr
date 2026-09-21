// Turns a Supabase auth error into something a person can act on. Raw messages
// are only shown for ordinary 4xx problems ("Invalid login credentials", "Password
// should be at least 8 characters"). Server and network failures used to surface
// as whatever the SDK could stringify, which was sometimes the literal text "{}"
// (a failing email sender made password reset look like that).
export const MIN_PASSWORD_LENGTH = 8;

export function authErrorMessage(error) {
  const message = String(error?.message || "").trim();
  const status = error?.status;
  if (status === 429 || /rate limit/i.test(message)) {
    return "Too many attempts right now. Please wait a few minutes and try again.";
  }
  if (!message || message === "{}" || status >= 500 || /retryable/i.test(error?.name || "") || /failed to fetch|network/i.test(message)) {
    return "We couldn't complete that right now. Please try again in a few minutes, or email hello@keepr.coach if it keeps happening.";
  }
  return message;
}
