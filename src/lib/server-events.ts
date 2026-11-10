import { serverErrorFrames } from "@/lib/server-error-frames";
import "server-only";
import { APIError } from "openai";
import {
  reportingContext,
  withReportingContext,
} from "@/lib/reporting-context";
import { captureLoggedFailure } from "@/lib/reporting-failures";

export function withServerContext<T>(
  requestId: string,
  route: string,
  work: () => T,
): T {
  return withReportingContext({ requestId, route }, work);
}

type Event = {
  event:
    | "api_request"
    | "api_failure"
    | "chat_stream_failure"
    | "chat_reply_complete"
    | "grading_failure"
    | "grading_attempt"
    | "grading_complete"
    | "model_call_complete"
    | "stage_assessment_failure"
    | "model_retry"
    | "model_test_fault"
    | "question_review_fallback"
    | "approval_email_sent"
    | "approval_email_failure"
    | "framework_failure"
    | "client_failure";
  checks?: { configuration: boolean; sharedStore: boolean };
  failureStage?:
    | "configuration"
    | "identity_or_invite"
    | "request_limit"
    | "handler"
    | "visitor_identity"
    | "visitor_ip";
  requestId?: string;
  route?: string;
  status?: number;
  durationMs?: number;
  kind?: string;
  fingerprint?: string;
  attempt?: number;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  reasoningTokens?: number;
};

/** A strict allowlist: never serialize messages, raw stacks, headers or request bodies. */
export function logServerEvent(event: Event, cause?: unknown): void {
  const record = {
    timestamp: new Date().toISOString(),
    ...reportingContext(),
    ...event,
    ...(event.event.includes("failure")
      ? { errorFrames: serverErrorFrames(cause) }
      : {}),
    ...(cause instanceof APIError ? { providerStatus: cause.status } : {}),
    ...(cause instanceof Error
      ? { errorType: safeErrorType(cause.constructor.name) }
      : {}),
  };
  captureLoggedFailure(event, cause);
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
    "APIUserAbortError",
    "InternalServerError",
    "BadRequestError",
    "AuthenticationError",
    "PermissionDeniedError",
    "RateLimitError",
    "BetaUnavailableError",
  ].includes(name)
    ? name
    : "Error";
}
