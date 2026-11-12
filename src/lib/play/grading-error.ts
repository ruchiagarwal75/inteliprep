import "server-only";
import { APIError } from "openai";
import { z } from "zod";
export class PlayGradingError extends Error {
  constructor(
    public readonly stage: "provider" | "incomplete_output" | "validation",
    cause?: unknown,
  ) {
    super(
      "AI grading is unavailable right now. Your answer is saved. Please try again later.",
      { cause },
    );
    this.name = "PlayGradingError";
  }
}
const providerCodes = z.enum([
  "invalid_api_key",
  "expired_secret_key",
  "insufficient_quota",
  "model_not_found",
  "context_length_exceeded",
  "invalid_request_error",
  "rate_limit_exceeded",
]);
/** Diagnostics are fixed categories and codes, never provider messages or answer text. */
export function playFailureDetails(cause: unknown) {
  const original = cause instanceof PlayGradingError ? cause.cause : cause;
  const code = providerCodes.safeParse(
    original instanceof APIError ? original.code : undefined,
  );
  return {
    original,
    fields: {
      ...(cause instanceof PlayGradingError
        ? { playGradingStage: cause.stage }
        : {}),
      ...(original instanceof APIError
        ? {
            kind:
              original.status === 401 || original.status === 403
                ? "play:provider_authentication"
                : "play:provider_request",
          }
        : {}),
      ...(code.success ? { providerCode: code.data } : {}),
      ...(original instanceof z.ZodError
        ? { validationIssueCount: original.issues.length }
        : {}),
    },
  };
}
