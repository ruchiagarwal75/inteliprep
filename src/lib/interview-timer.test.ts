import { describe, expect, it } from "vitest";
import {
  createInterviewTiming,
  formatInterviewTime,
  interviewTimingSchema,
  remainingInterviewSeconds,
  serverClockOffset,
  shouldAutoEndInterview,
} from "@/lib/interview-timer";
import { interviewStartRequestSchema } from "@/lib/interview-selection";

const now = Date.parse("2026-10-12T20:00:00.000Z");
describe("interview deadline and countdown", () => {
  it.each([1, 45] as const)("creates a fixed %i-minute deadline", (minutes) => {
    const timing = createInterviewTiming(minutes, now);
    expect(interviewTimingSchema.parse(timing)).toEqual(timing);
    expect(Date.parse(timing.deadlineAt) - now).toBe(minutes * 60_000);
    expect(remainingInterviewSeconds(timing, now)).toBe(minutes * 60);
  });
  it("defaults new interviews to 45 minutes and accepts the explicit 1-minute test mode", () => {
    const selection = { problemId: "single-server-scaling", level: "mid" };
    expect(interviewStartRequestSchema.parse(selection).durationMinutes).toBe(
      45,
    );
    expect(
      interviewStartRequestSchema.parse({ ...selection, durationMinutes: 1 })
        .durationMinutes,
    ).toBe(1);
    for (const durationMinutes of [0, 2, 46, "1", Infinity])
      expect(
        interviewStartRequestSchema.safeParse({ ...selection, durationMinutes })
          .success,
      ).toBe(false);
  });
  it("ignores client-supplied start/deadline overrides", () => {
    const parsed = interviewStartRequestSchema.parse({
      problemId: "single-server-scaling",
      level: "mid",
      startedAt: "fake",
      deadlineAt: "fake",
      timing: { durationMinutes: 99 },
    });
    expect(parsed).toEqual({
      problemId: "single-server-scaling",
      level: "mid",
      durationMinutes: 45,
    });
  });
  it("expires at the exact deadline, stays at zero, and rounds fractional seconds up", () => {
    const timing = createInterviewTiming(1, now);
    expect(remainingInterviewSeconds(timing, now + 59_001)).toBe(1);
    expect(remainingInterviewSeconds(timing, now + 59_999)).toBe(1);
    expect(remainingInterviewSeconds(timing, now + 60_000)).toBe(0);
    expect(remainingInterviewSeconds(timing, now + 120_000)).toBe(0);
  });
  it("accounts for hidden tabs or sleep without waiting for missed interval callbacks", () => {
    const timing = createInterviewTiming(45, now);
    expect(remainingInterviewSeconds(timing, now + 30 * 60_000)).toBe(15 * 60);
    expect(remainingInterviewSeconds(timing, now + 46 * 60_000)).toBe(0);
  });
  it("aligns fast or slow client clocks to the server time and accepts legacy untimed records", () => {
    const timing = createInterviewTiming(1, now);
    for (const clientNow of [now + 5 * 60_000, now - 8 * 60_000]) {
      const offset = serverClockOffset(new Date(now).toISOString(), clientNow);
      expect(remainingInterviewSeconds(timing, clientNow + offset)).toBe(60);
    }
    expect(serverClockOffset(undefined, now)).toBe(0);
    expect(remainingInterviewSeconds(undefined, now)).toBe(0);
  });
  it.each([
    [2700, "45:00"],
    [60, "01:00"],
    [59, "00:59"],
    [0, "00:00"],
  ])("formats %i seconds as %s", (seconds, formatted) => {
    expect(formatInterviewTime(seconds)).toBe(formatted);
  });
  it("rejects inconsistent, malformed, or unsupported deadline data", () => {
    const timing = createInterviewTiming(1, now);
    expect(
      interviewTimingSchema.safeParse({
        ...timing,
        deadlineAt: new Date(now + 120_000).toISOString(),
      }).success,
    ).toBe(false);
    expect(
      interviewTimingSchema.safeParse({ ...timing, startedAt: "invalid" })
        .success,
    ).toBe(false);
    expect(
      interviewTimingSchema.safeParse({ ...timing, durationMinutes: 2 })
        .success,
    ).toBe(false);
  });
});

describe("automatic end scheduling", () => {
  const idleExpired = {
    expired: true,
    isReplying: false,
    isEnding: false,
    hasEnded: false,
    hasScorecard: false,
    disabled: false,
    attempted: false,
  };
  it("starts scoring once after expiry while idle", () => {
    expect(shouldAutoEndInterview(idleExpired)).toBe(true);
    expect(shouldAutoEndInterview({ ...idleExpired, attempted: true })).toBe(
      false,
    );
  });
  it("waits for a running reply and grades once that reply finishes", () => {
    expect(shouldAutoEndInterview({ ...idleExpired, isReplying: true })).toBe(
      false,
    );
    expect(shouldAutoEndInterview(idleExpired)).toBe(true);
  });
  it.each([
    "isEnding",
    "hasEnded",
    "hasScorecard",
    "disabled",
    "attempted",
  ] as const)("does not regenerate or race when %s", (flag) => {
    expect(shouldAutoEndInterview({ ...idleExpired, [flag]: true })).toBe(
      false,
    );
  });
  it("never ends before the deadline", () => {
    expect(shouldAutoEndInterview({ ...idleExpired, expired: false })).toBe(
      false,
    );
  });
});
