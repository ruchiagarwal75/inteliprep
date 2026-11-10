import { expect, it } from "vitest";
import {
  scoringEligibility,
  scoringElapsedSeconds,
  scoringThresholdSeconds,
} from "@/lib/scoring-eligibility";
import { createInterviewTiming } from "@/lib/interview-timer";
it("uses the same scaled one-third threshold for every duration", () => {
  expect(scoringThresholdSeconds(45)).toBe(900);
  expect(scoringThresholdSeconds(60)).toBe(1200);
  expect(scoringThresholdSeconds(1)).toBe(20);
  expect(scoringEligibility(45, 300, 2).eligible).toBe(false);
  expect(scoringEligibility(45, 901, 2).eligible).toBe(true);
  expect(scoringEligibility(60, 900, 2).eligible).toBe(false);
  expect(scoringEligibility(60, 1200, 2).eligible).toBe(true);
  expect(scoringEligibility(45, 1000, 1)).toMatchObject({
    timeReady: true,
    stagesReady: false,
    eligible: false,
  });
});
it("bounds elapsed time to the fixed start and deadline", () => {
  const timing = createInterviewTiming(45, 0);
  expect(scoringElapsedSeconds(timing, new Date(300000).toISOString())).toBe(
    300,
  );
  expect(scoringElapsedSeconds(timing, new Date(-1000).toISOString())).toBe(0);
  expect(scoringElapsedSeconds(timing, new Date(9999999).toISOString())).toBe(
    2700,
  );
});
