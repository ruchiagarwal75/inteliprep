import { expect, it } from "vitest";
import { stageTimeGate } from "@/lib/stage-clock";
import { createInterviewTiming } from "@/lib/interview-timer";
import { planPhaseProgress } from "@/lib/phase-progress";
import { getProblem } from "@/lib/problems";
const start = Date.parse("2026-11-05T12:00:00Z");
const timing = createInterviewTiming(45, start);
const clock = (entered: number, now: number) => ({
  timing,
  enteredAt: new Date(start + entered * 60_000).toISOString(),
  now: start + now * 60_000,
});
it("keeps a decent 45-minute interview in core or reliability at 25 minutes left", () => {
  const problem = getProblem("rate-limiter");
  if (!problem) throw new Error("Missing problem");
  const progress = {
    step: "review" as const,
    candidateTurns: 99,
    discussionTurnLimit: 3,
  };
  const covered = problem.phases[2].completionCriteria.map((_, i) => i);
  expect(
    planPhaseProgress(
      problem,
      { phaseIndex: 2, coveredCriteria: covered },
      progress,
      undefined,
      covered,
      clock(13, 20),
    ).state.phaseIndex,
  ).toBe(2);
  expect(stageTimeGate(3, true, clock(14, 20)).advance).toBe(false);
  expect(stageTimeGate(3, true, clock(14, 36.9)).wrap).toBe(false);
  expect(stageTimeGate(3, true, clock(14, 37)).wrap).toBe(true);
});
it("combines topic coverage with minimum/maximum time and skips minimums for test sessions", () => {
  expect(stageTimeGate(0, true, clock(0, 1)).advance).toBe(false);
  expect(stageTimeGate(0, true, clock(0, 3)).advance).toBe(true);
  expect(stageTimeGate(0, false, clock(0, 8)).advance).toBe(true);
  expect(stageTimeGate(2, true, clock(5, 12)).advance).toBe(false);
  expect(stageTimeGate(2, true, clock(5, 13)).advance).toBe(true);
  expect(stageTimeGate(2, false, clock(5, 20)).advance).toBe(true);
  expect(
    stageTimeGate(2, true, {
      ...clock(0, 0),
      timing: createInterviewTiming(1, start),
    }).advance,
  ).toBe(true);
});
it("scales one-hour stage minimums and forces wrap-up with 10:40 remaining", () => {
  const hour = (minutes: number) => ({
    timing: createInterviewTiming(60, start),
    enteredAt: new Date(start).toISOString(),
    now: start + minutes * 60_000,
  });
  expect(stageTimeGate(0, true, hour(3.9)).advance).toBe(false);
  expect(stageTimeGate(0, true, hour(4)).advance).toBe(true);
  expect(stageTimeGate(2, true, hour(10)).advance).toBe(false);
  expect(stageTimeGate(2, true, hour(11)).advance).toBe(true);
  expect(stageTimeGate(3, true, hour(49)).wrap).toBe(false);
  expect(stageTimeGate(3, true, hour(49 + 1 / 3)).wrap).toBe(true);
});
