import {
  APIError,
  APIConnectionTimeoutError,
  APIConnectionError,
} from "openai";
import { expect, it } from "vitest";
import { failureCategory } from "@/lib/reporting-failures";
import { BetaUnavailableError } from "@/lib/beta-config";
it("classifies provider and shared-store failures without serializing their details", () => {
  expect(failureCategory(new APIConnectionTimeoutError())).toBe("timeout");
  expect(failureCategory(new APIConnectionError({}))).toBe("network");
  for (const [status, category] of [
    [401, "provider_authentication"],
    [429, "provider_limit"],
    [503, "provider_unavailable"],
  ] as const)
    expect(
      failureCategory(
        new APIError(
          status,
          { message: "private payload" },
          "secret",
          new Headers(),
        ),
      ),
    ).toBe(category);
  expect(failureCategory(new BetaUnavailableError())).toBe(
    "shared_store_or_configuration",
  );
  const abort = new Error("private");
  abort.name = "AbortError";
  expect(failureCategory(abort)).toBe("cancelled");
  expect(failureCategory(new Error("private"))).toBe("unknown");
});
