import { expect, it } from "vitest";
import {
  retryAfterSeconds,
  responseRateLimit,
  rateLimitMessage,
} from "@/lib/retry-after";
it("reads both seconds and HTTP dates and rejects invalid wait times", () => {
  const now = Date.parse("2026-11-05T12:00:00Z");
  expect(retryAfterSeconds("12", now)).toBe(12);
  expect(retryAfterSeconds("Thu, 05 Nov 2026 12:00:10 GMT", now)).toBe(10);
  for (const value of [null, "", "invalid", "-3"])
    expect(retryAfterSeconds(value, now)).toBeUndefined();
  expect(
    responseRateLimit(
      new Response(null, { status: 429, headers: { "Retry-After": "12" } }),
      now,
    )?.retryAt,
  ).toBe(now + 12_000);
  expect(rateLimitMessage(1)).toContain("1 second.");
  expect(rateLimitMessage(0)).toBe("You can retry now.");
});
