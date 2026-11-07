import { describe, expect, it } from "vitest";
import {
  elapsedInterviewTime,
  validCompletedSeconds,
  type DurationRecord,
} from "@/lib/reporting-duration";
const base: DurationRecord = {
  status: "completed",
  startedAt: "2026-11-06T12:00:00Z",
  endedAt: "2026-11-06T12:12:10Z",
  lastActivityAt: "2026-11-06T12:13:00Z",
};
describe("admin elapsed interview timing", () => {
  it("uses the frozen server ending, never feedback generation or a later activity", () => {
    expect(elapsedInterviewTime(base).seconds).toBe(730);
    expect(validCompletedSeconds(base)).toBe(730);
  });
  it("includes explicit exits but excludes them from completed averages", () => {
    const exit = { ...base, status: "exited" as const };
    expect(elapsedInterviewTime(exit).seconds).toBe(730);
    expect(validCompletedSeconds(exit)).toBeNull();
  });
  it("freezes unfinished estimates at the last meaningful action without a presence heuristic", () => {
    const unfinished = {
      ...base,
      status: "unfinished" as const,
      endedAt: null,
    };
    expect(elapsedInterviewTime(unfinished)).toEqual({
      seconds: 780,
      label: expect.stringContaining("estimate"),
    });
    expect(elapsedInterviewTime(unfinished).seconds).toBe(780);
    expect(validCompletedSeconds(unfinished)).toBeNull();
  });
  it.each([
    { startedAt: null },
    { endedAt: null },
    { endedAt: "invalid" },
    { endedAt: "2026-11-06T11:59:59Z" },
  ])("omits unreliable completed timings (%j)", (update) => {
    expect(validCompletedSeconds({ ...base, ...update })).toBeNull();
  });
  it("does not substitute activity time for an unknown completion time", () => {
    expect(elapsedInterviewTime({ ...base, endedAt: null }).seconds).toBeNull();
  });
  it("does not manufacture timing for a recovered session with no recorded activity", () => {
    expect(
      elapsedInterviewTime({
        ...base,
        status: "unfinished",
        endedAt: null,
        lastActivityAt: null,
      }).seconds,
    ).toBeNull();
  });
});
