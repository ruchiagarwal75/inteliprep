import "server-only";
import { APIError } from "openai";
import { logServerEvent } from "@/lib/server-events";

export function chatError(
  message: string,
  status: number,
  code?: string,
): Response {
  return Response.json(
    { error: message, ...(code ? { code } : {}) },
    { status },
  );
}

/** Keep provider credentials/detail out of responses and distinguish app authentication. */
export function upstreamChatError(cause: unknown, requestId: string): Response {
  logServerEvent(
    { event: "api_failure", route: "/api/chat", requestId },
    cause,
  );
  if (cause instanceof APIError) {
    const status =
      cause.status === 401 || cause.status === 403
        ? 503
        : cause.status === 429
          ? 429
          : 502;
    return chatError(
      "Interviewer unavailable. Please try again.",
      status,
      "INTERVIEWER_UNAVAILABLE",
    );
  }
  return chatError(
    "Interviewer unavailable. Please try again.",
    502,
    "INTERVIEWER_UNAVAILABLE",
  );
}
