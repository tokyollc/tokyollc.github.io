
import { ChatSession } from "./chat-session";
import { Analytics } from "./analytics";

interface ChatRequest {
  message?: string;
  sessionId?: string;
  action?: "chat" | "clear";
}

// Only these sites may call the chat API from a browser.
const ALLOWED_ORIGINS = [
  "https://tokyollc.com",
  "https://www.tokyollc.com",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];

function corsHeadersFor(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function jsonResponse(
  data: unknown,
  status = 200
): Response {
  return Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export { ChatSession, Analytics };

export default {
  async fetch(request, env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeadersFor(request) });
    }

    // Add the CORS headers for this request's origin to every response.
    const response = await handleRequest(request, env);
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(corsHeadersFor(request))) {
      headers.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers });
  },
} satisfies ExportedHandler<Env>;

// The chat endpoint. "/api/chat" is the old address, kept temporarily so
// the previous website version keeps working during deploys; remove later.
const CHAT_PATHS = ["/chat", "/api/chat"];

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);

  if (!CHAT_PATHS.includes(pathname)) {
    return jsonResponse({ error: "Not found." }, 404);
  }

  if (request.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed. Use POST." },
      405
    );
  }

 const contentLength = request.headers.get("Content-Length");

  if (contentLength && Number(contentLength) > 64 * 1024) {
    return jsonResponse(
      { error: "Request body is too large." },
      413
    );
  }

  let body: ChatRequest;

  try {
    const rawBody = await request.text();

    if (new TextEncoder().encode(rawBody).byteLength > 64 * 1024) {
      return jsonResponse(
        { error: "Request body is too large." },
        413
      );
    }

    const parsed: unknown = JSON.parse(rawBody);

    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return jsonResponse(
        { error: "Request body must be a JSON object." },
        400
      );
    }

    body = parsed as ChatRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

   if (
    body.action !== undefined &&
    body.action !== "chat" &&
    body.action !== "clear"
  ) {
    return jsonResponse(
      { error: "Invalid action. Use 'chat' or 'clear'." },
      400
    );
  }
  if (
    body.action !== "clear" &&
    (typeof body.message !== "string" || !body.message.trim())
  ) {
    return jsonResponse(
      { error: "The 'message' field is required." },
      400
    );
  }

  if (body.message && body.message.length > 4000) {
    return jsonResponse(
      { error: "Message is too long. Maximum is 4000 characters." },
      400
    );
  }

  // Reuse the supplied session ID, or create a new anonymous session.
  const sessionId =
  typeof body.sessionId === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    body.sessionId
  )
    ? body.sessionId
    : crypto.randomUUID();

  const session = env.CHAT_SESSIONS.get(
    env.CHAT_SESSIONS.idFromName(sessionId)
  );

  try {
    const sessionResponse = await session.fetch(
      "https://chat-session.internal/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: body.action ?? "chat",
          message: body.message,
        }),
      }
    );

    const data = (await sessionResponse.json()) as Record<string, unknown>;

    return jsonResponse(
      {
        ...data,
        sessionId,
      },
      sessionResponse.status
    );
  } catch (error) {
    console.error("Session error:", error);

    return jsonResponse(
      { error: "The chat session could not be processed." },
      500
    );
  }
}