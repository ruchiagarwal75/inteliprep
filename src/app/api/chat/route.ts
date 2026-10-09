import { APIError } from "openai";
import { chatRequestSchema } from "@/lib/chat";
import { hasApiKey, streamInterviewerReply } from "@/lib/llm";

export const runtime = "nodejs";

function error(message: string, status: number, code?: string): Response {
  return Response.json(
    { error: message, ...(code ? { code } : {}) },
    { status },
  );
}

/** Keeps provider detail (billing URLs, org ids) out of the client response
 * while leaving the code visible enough to debug against the logs. */
function upstreamError(cause: unknown): Response {
  console.error("chat upstream failed", cause);
  if (cause instanceof APIError) {
    const status = cause.status ?? 502;
    return error(
      "The language model rejected the request",
      status,
      cause.code ?? undefined,
    );
  }
  return error("The language model could not be reached", 502);
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("Body must be valid JSON", 400);
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  }

  if (!hasApiKey()) {
    return error("Server is missing OPENAI_KEY", 500);
  }

  const deltas = streamInterviewerReply(parsed.data.messages, request.signal);

  // Pull the first delta before answering, so an upstream failure still maps to
  // a real status code and a readable message instead of an empty body.
  let first;
  try {
    first = await deltas.next();
  } catch (cause) {
    return upstreamError(cause);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!first.done && first.value) {
          controller.enqueue(encoder.encode(first.value));
        }
        for await (const delta of deltas) {
          controller.enqueue(encoder.encode(delta));
        }
        controller.close();
      } catch (cause) {
        // Past this point the status is already sent, so the client sees a
        // truncated reply. The reason only reaches the logs.
        console.error("chat stream interrupted", cause);
        controller.error(cause);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
