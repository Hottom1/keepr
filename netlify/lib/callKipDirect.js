// Server-side equivalent of the client's callKip — direct Anthropic call,
// no proxy hop, since there's no browser session to route through when
// this runs from a scheduled function. Extracted here (was duplicated
// verbatim in scheduled-alerts.js before the coach-digest feature needed
// the exact same thing) so there's one implementation, not two drifting
// copies of the same fetch/error-handling logic.
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function callKipDirect(system, userMessage, maxTokens = 600) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Kip generation failed");
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}
