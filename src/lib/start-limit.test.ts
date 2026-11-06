import { expect, it } from "vitest";
import { startLimitMessage } from "@/lib/start-limit";
it("renders long waits as a local retry time instead of a seconds count", () => {
  const now = Date.parse("2026-11-06T12:00:00Z");
  const message = startLimitMessage(now + 29280_000, now);
  expect(message).toContain("today's practice limit");
  expect(message).toContain("Try again at");
  expect(message).not.toContain("29280");
});
it("keeps short waits readable", () => {
  expect(startLimitMessage(61_000, 0)).toContain("about 2 minutes");
  expect(startLimitMessage(1_000, 0)).toContain("1 second.");
});
