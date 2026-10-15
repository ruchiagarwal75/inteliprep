import { describe, expect, it } from "vitest";
import { historyInterviewState } from "@/lib/interview-history-state";
import { savedFixture } from "@/lib/fixtures/saved-interview-test";
import { savedInterviewSummary } from "@/lib/saved-interview";
import { createInterviewTiming } from "@/lib/interview-timer";

const start = Date.parse("2026-10-13T20:00:00.000Z");
function entry() {
  const saved = savedFixture();
  saved.interview.timing = createInterviewTiming(1, start);
  saved.updatedAt = new Date(start).toISOString();
  saved.clockOffsetMs = 0;
  return savedInterviewSummary(saved);
}
describe("unopened interview history", () => {
  it("advances live time without another save and caps an abandoned test at one minute", () => {
    const row = entry();
    expect(historyInterviewState(row, start + 30_000)).toEqual({
      status: "in_progress",
      elapsedSeconds: 30,
    });
    expect(historyInterviewState(row, start + 210_000)).toEqual({
      status: "expired",
      elapsedSeconds: 60,
    });
    expect(historyInterviewState(row, start + 24 * 3600_000)).toEqual({
      status: "expired",
      elapsedSeconds: 60,
    });
    expect(row.hasEnded).toBe(false);
  });
  it("changes status at the exact deadline and uses the calibrated server clock", () => {
    const row = entry();
    row.clockOffsetMs = -5 * 60_000;
    expect(historyInterviewState(row, start + 5 * 60_000 + 59_999)).toEqual({
      status: "in_progress",
      elapsedSeconds: 59,
    });
    expect(historyInterviewState(row, start + 5 * 60_000 + 60_000)).toEqual({
      status: "expired",
      elapsedSeconds: 60,
    });
  });
  it("keeps confirmed ended time fixed and does not fabricate deadlines for legacy saves", () => {
    const row = entry();
    row.hasEnded = true;
    row.elapsedSeconds = 15;
    expect(historyInterviewState(row, start + 210_000)).toEqual({
      status: "ended",
      elapsedSeconds: 15,
    });
    row.elapsedSeconds = 210;
    expect(historyInterviewState(row, start + 210_000)).toEqual({
      status: "ended",
      elapsedSeconds: 60,
    });
    row.hasEnded = false;
    row.timing = undefined;
    expect(historyInterviewState(row, start + 210_000)).toEqual({
      status: "saved",
    });
  });
});
