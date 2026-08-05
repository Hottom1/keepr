import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

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
      max_tokens: maxTokens || 1000,
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
