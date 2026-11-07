import {
  APIConnectionTimeoutError,
  APIConnectionError,
  APIError,
} from "openai";
import { expect, it } from "vitest";
import { gradingFailureKind, GradingOutputError } from "@/lib/grading-failure";

it("identifies timeout classes even when the SDK names the error Error", () => {
  const timeout = new APIConnectionTimeoutError();
  expect(gradingFailureKind(timeout)).toBe("timeout");
  expect(gradingFailureKind(new APIConnectionError({}))).toBe("network");
  expect(gradingFailureKind(new SyntaxError("private response"))).toBe(
    "invalid_json",
  );
  expect(gradingFailureKind(new GradingOutputError("refusal"))).toBe("refusal");
  expect(gradingFailureKind(new GradingOutputError("truncated_output"))).toBe(
    "truncated_output",
  );
  expect(
    gradingFailureKind(new APIError(503, undefined, "private", undefined)),
  ).toBe("provider_request");
});
