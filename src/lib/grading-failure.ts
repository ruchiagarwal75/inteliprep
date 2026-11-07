import {
  APIConnectionTimeoutError,
  APIConnectionError,
  APIError,
  APIUserAbortError,
} from "openai";
import { ZodError } from "zod";

export class GradingOutputError extends Error {
  constructor(
    public readonly kind:
      | "refusal"
      | "truncated_output"
      | "provider_output_failure"
      | "schema_validation",
  ) {
    super(`Grading output failed: ${kind}`);
  }
}

/** Diagnostic categories only: never log provider bodies or candidate evidence. */
export function gradingFailureKind(cause: unknown) {
  if (cause instanceof APIConnectionTimeoutError) return "timeout";
  if (cause instanceof APIConnectionError) return "network";
  if (cause instanceof APIUserAbortError) return "cancelled";
  if (cause instanceof GradingOutputError) return cause.kind;
  if (cause instanceof ZodError) return "schema_validation";
  if (cause instanceof SyntaxError) return "invalid_json";
  if (cause instanceof APIError) return "provider_request";
  if (cause instanceof Error && cause.name === "AbortError") return "cancelled";
  return "validation";
}
