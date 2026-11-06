import "server-only";
import { APIError } from "openai";
import { AsyncLocalStorage } from "node:async_hooks";

const context = new AsyncLocalStorage<{ requestId: string; route: string }>();

export function withServerContext<T>(
  requestId: string,
  route: string,
  work: () => T,
): T {
  return context.run({ requestId, route }, work);
}

type Event = {
  event:
    | "api_request"
    | "api_failure"
    | "chat_stream_failure"
    | "chat_reply_complete"
    | "grading_failure"
    | "stage_assessment_failure"
    | "model_retry"
    | "model_test_fault"
    | "question_review_fallback"
    | "framework_failure"
    | "client_failure";
  requestId?: string;
  route?: string;
  status?: number;
  durationMs?: number;
  kind?: string;
  fingerprint?: string;
};

/** A strict allowlist: never serialize errors, messages, stacks, headers or request bodies. */
export function logServerEvent(event: Event, cause?: unknown): void {
  const record = {
    timestamp: new Date().toISOString(),
    ...context.getStore(),
    ...event,
    ...(cause instanceof APIError ? { providerStatus: cause.status } : {}),
    ...(cause instanceof Error ? { errorType: safeErrorType(cause.name) } : {}),
  };
  const line = JSON.stringify(record);
  if (event.event.includes("failure")) console.error(line);
  else console.info(line);
}

function safeErrorType(name: string): string {
  return [
    "Error",
    "TypeError",
    "RangeError",
    "AbortError",
    "APIError",
    "APIConnectionError",
    "APIConnectionTimeoutError",
    "BetaUnavailableError",
  ].includes(name)
    ? name
    : "Error";
}
