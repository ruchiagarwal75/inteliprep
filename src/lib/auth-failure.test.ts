import { describe, expect, it } from "vitest";
import { authFailureKind } from "@/lib/auth-failure";

describe("safe authentication failure diagnostics", () => {
  it("distinguishes DNS, unavailable transport and timeouts from rejected login", () => {
    for (const error of [
      { name: "AuthRetryableFetchError", status: 0 },
      { name: "TypeError", cause: { code: "ENOTFOUND" } },
      { code: "ECONNREFUSED" },
      { name: "AbortError" },
      { name: "TimeoutError" },
    ])
      expect(authFailureKind(error)).toBe("connection");
    expect(authFailureKind({ status: 400, code: "invalid_grant" })).toBe(
      "rejected",
    );
  });
  it("identifies missing PKCE state without returning any verifier or credential", () => {
    expect(
      authFailureKind({
        name: "AuthPKCECodeVerifierMissingError",
        message: "private-verifier",
      }),
    ).toBe("verifier");
    for (const error of [
      undefined,
      null,
      "private-provider-error",
      { message: "private-provider-error" },
    ])
      expect(authFailureKind(error)).toBe("rejected");
  });
});
