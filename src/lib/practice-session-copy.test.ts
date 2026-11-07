import { expect, it } from "vitest";
import {
  attemptCount,
  friendlySessionDate,
  sessionStatusCopy,
} from "@/lib/practice-session-copy";
import { savedInterviewSummary } from "@/lib/saved-interview";
import { savedFixture } from "@/lib/fixtures/saved-interview-test";
it("uses friendly local day labels across a month boundary", () => {
  const now = new Date(2026, 10, 1, 21, 0).getTime();
  expect(
    friendlySessionDate(new Date(2026, 10, 1, 19, 59).toISOString(), now),
  ).toBe("Today, 7:59 PM");
  expect(
    friendlySessionDate(new Date(2026, 9, 31, 10, 5).toISOString(), now),
  ).toBe("Yesterday, 10:05 AM");
  expect(
    friendlySessionDate(new Date(2025, 8, 15, 10, 5).toISOString(), now),
  ).toContain("2025");
});
it("pluralizes attempt links and changes only the display label of a short interview", () => {
  expect(attemptCount(1)).toBe("1 attempt");
  expect(attemptCount(2)).toBe("2 attempts");
  const entry = {
    ...savedInterviewSummary(savedFixture()),
    signal: "insufficient_evidence" as const,
  };
  expect(sessionStatusCopy(entry, { status: "ended" })).toBe(
    "Too short to score",
  );
  expect(entry.signal).toBe("insufficient_evidence");
});
