import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Server-side bounds on what a signed-in caller can make this proxy send to
// Anthropic on Keepr's key. The client only ever asks for <= 4000 output
// tokens and only ever defines the two tools below, so these limits change
// nothing for the app itself; they exist because the endpoint used to forward
// max_tokens, tools and prompt size exactly as supplied (security audit E1).
const MAX_OUTPUT_TOKENS = 4096;
// Generous for a real, ever-growing Kip conversation (roughly 100k tokens of
// text) while still refusing multi-million-token prompts. Base64 image/PDF
// payloads are excluded from this count and bounded by Netlify's own request
// size limit plus MAX_MEDIA_BLOCKS.
const MAX_TEXT_CHARS = 400000;
const MAX_MESSAGES = 500;
const MAX_MEDIA_BLOCKS = 12;
// Only Keepr's own client-executed tools (KIP_TOOLS in src/App.jsx). Anything
// else, notably Anthropic server-side tools that bill per use, is refused.
const ALLOWED_TOOL_NAMES = new Set(["build_training_block", "get_stats"]);

function badRequest(message) {
  return new Response(JSON.stringify({ error: message }), { status: 400, headers: { "Content-Type": "application/json" } });
}

// Returns { text, media } sizes for a message/system content value (string or
// block array), so the limits above can be enforced without caring whether the
// caller used plain strings or structured blocks.
function measureContent(content) {
  if (typeof content === "string") return { text: content.length, media: 0 };
  if (!Array.isArray(content)) return { text: 0, media: 0 };
  let text = 0;
  let media = 0;
  for (const b of content) {
    if (!b || typeof b !== "object") continue;
    if (b.type === "image" || b.type === "document") { media += 1; continue; }
    if (typeof b.text === "string") text += b.text.length;
    if (b.type === "tool_use" && b.input) text += JSON.stringify(b.input).length;
    if (b.type === "tool_result") {
      const inner = measureContent(b.content);
      text += inner.text;
      media += inner.media;
    }
  }
  return { text, media };
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing auth token" }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { system, messages, maxTokens, tools, tool_choice } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages must be a non-empty array" }), { status: 400 });
  }
  if (messages.length > MAX_MESSAGES) return badRequest("Conversation is too long");
  if (messages.some((m) => !m || (m.role !== "user" && m.role !== "assistant"))) return badRequest("Invalid message role");

  if (tools !== undefined) {
    const valid = Array.isArray(tools) && tools.length > 0 && tools.every((t) => t && typeof t === "object" && t.type === undefined && ALLOWED_TOOL_NAMES.has(t.name));
    if (!valid) return badRequest("Unsupported tools");
  }
  if (tool_choice !== undefined) {
    const t = tool_choice?.type;
    const valid = tools !== undefined && (t === "auto" || t === "any" || t === "none" || (t === "tool" && ALLOWED_TOOL_NAMES.has(tool_choice.name)));
    if (!valid) return badRequest("Unsupported tool_choice");
  }

  let textChars = 0;
  let mediaBlocks = 0;
  for (const part of [measureContent(system), ...messages.map((m) => measureContent(m.content))]) {
    textChars += part.text;
    mediaBlocks += part.media;
  }
  if (textChars > MAX_TEXT_CHARS) return badRequest("Request is too large");
  if (mediaBlocks > MAX_MEDIA_BLOCKS) return badRequest("Too many attachments");

  const requestedTokens = Number(maxTokens);
  const maxOutputTokens = Number.isFinite(requestedTokens) && requestedTokens > 0
    ? Math.min(Math.floor(requestedTokens), MAX_OUTPUT_TOKENS)
    : 1000;

  // Content blocks are forwarded verbatim (string or array — e.g. an image/
  // document block for PT-plan extraction), so no shape change was needed
  // here for that. The PDF beta header is only added when a message
  // actually carries a document block, so ordinary chat is unaffected.
  const hasDocument = messages.some((m) => Array.isArray(m.content) && m.content.some((b) => b?.type === "document"));

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      ...(hasDocument ? { "anthropic-beta": "pdfs-2024-09-25" } : {}),
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: maxOutputTokens,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      // Forwarded verbatim, same trust boundary as system/messages above —
      // the client already fully controls what goes into this request, tool
      // definitions are no different. Tools are always executed client-side
      // against real local app state, never on the server.
      ...(tools ? { tools } : {}),
      ...(tool_choice ? { tool_choice } : {}),
    }),
  });

  const data = await anthropicRes.json();
  return new Response(JSON.stringify(data), {
    status: anthropicRes.status,
    headers: { "Content-Type": "application/json" },
  });
};
