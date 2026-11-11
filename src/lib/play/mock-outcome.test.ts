import { expect, it } from "vitest";
import { scorecardFixture } from "@/lib/fixtures/scorecard-test";
import { mockOutcome } from "./mock-outcome";
const card = () => ({
  ...scorecardFixture(),
  session: {
    startedAt: "2026-11-11T00:00:00.000Z",
    elapsedSeconds: 2700,
    allowedSeconds: 2700,
    limited: false,
    note: "Complete",
  },
});
it("normalizes existing scores without changing the scorecard or weights", () => {
  const value = card();
  expect(mockOutcome(value)).toEqual({ points: 75, meetsBar: true });
  expect(value.areas[0].score).toBe(3);
  expect(mockOutcome({ ...value, signal: "no" })).toEqual({
    points: 75,
    meetsBar: false,
  });
});
it("gives no reward for too-short, unassessed or historical cards without timing", () => {
  const value = card();
  expect(mockOutcome({ ...value, notScoredReason: "too_short" })).toBeNull();
  expect(
    mockOutcome({ ...value, session: { ...value.session, limited: true } }),
  ).toBeNull();
  expect(mockOutcome({ ...value, session: undefined })).toBeNull();
  expect(mockOutcome({ ...value, signal: "insufficient_evidence" })).toBeNull();
});
