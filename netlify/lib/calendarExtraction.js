// Claude-extraction fallback for a forwarded calendar/match email that has
// no real .ics attachment — same "read it, extract structured fields,
// never commit without review" discipline as the PT/physio upload flow
// (src/App.jsx, extractPtPlanFromFile / PT_PLAN_EXTRACTION_PROMPT), just
// running server-side against raw email text instead of client-side
// against an uploaded file, since there's no browser session to call the
// kip-chat proxy from when an email arrives asynchronously. Calls
// Anthropic directly with ANTHROPIC_API_KEY, same key the proxy uses.
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const CALENDAR_EXTRACTION_PROMPT = `You are reading a forwarded email for a handball goalkeeper, checking whether it describes a specific match or training session they should add to their calendar. Respond with ONLY a single JSON object, no other text before or after it, in exactly this shape:

{"looksLikeCalendarItem": boolean, "kind": "match" | "training" | null, "title": string or null, "date": "YYYY-MM-DD" or null, "time": "HH:MM" or null, "location": string or null, "reason": string or null}

- "looksLikeCalendarItem" is true only if this genuinely describes one specific dated match or training session — not a newsletter, a general announcement, a thread with no clear date, or a schedule covering many dates (that's a different flow).
- "kind" is "match" if it's a game/fixture against an opponent, "training" for a practice/training session. If you can't tell, set "looksLikeCalendarItem" to false instead of guessing.
- "title" should be a short label — for a match, something like "vs [Opponent]"; for training, whatever the session is called, or "Training session" if nothing more specific is given.
- "date" must be a real calendar date in YYYY-MM-DD form, inferred from whatever's in the email (including relative phrasing like "this Saturday" if a send date is evident) — if you can't pin down an actual date, set "looksLikeCalendarItem" to false.
- If "looksLikeCalendarItem" is false, set "kind"/"title"/"date"/"time"/"location" to null and put a short plain-English reason in "reason" (e.g. "This reads like a general club newsletter, not a specific fixture").
- Never invent a date, opponent, or location that isn't actually stated or clearly implied.`;

export async function extractCalendarInfoFromEmail({ subject, text, html }) {
  const body = (text && text.trim()) || (html && html.trim()) || "";
  const emailContent = `Subject: ${subject || "(no subject)"}\n\n${body}`.slice(0, 12000);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 500,
      system: CALENDAR_EXTRACTION_PROMPT,
      messages: [{ role: "user", content: `Here's the forwarded email:\n\n${emailContent}` }],
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Calendar extraction request failed");
  const responseText = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    return {
      looksLikeCalendarItem: !!parsed.looksLikeCalendarItem,
      kind: parsed.kind || null,
      title: parsed.title || null,
      date: parsed.date || null,
      time: parsed.time || null,
      location: parsed.location || null,
      reason: parsed.reason || null,
    };
  } catch (e) {
    return { looksLikeCalendarItem: false, kind: null, title: null, date: null, time: null, location: null, reason: "Kip's response wasn't in the expected format." };
  }
}
