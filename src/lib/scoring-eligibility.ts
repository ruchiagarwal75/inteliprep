import type { InterviewDuration, InterviewTiming } from "@/lib/interview-timer";
export const MIN_SCORED_STAGES = 2;

export function scoringThresholdSeconds(durationMinutes: number) {
  return (durationMinutes * 60) / 3;
}
export function scoringEligibility(
  durationMinutes: InterviewDuration,
  elapsedSeconds: number,
  answeredStages?: number,
) {
  const minimumSeconds = scoringThresholdSeconds(durationMinutes);
  const timeReady = elapsedSeconds >= minimumSeconds;
  const stagesReady =
    answeredStages === undefined || answeredStages >= MIN_SCORED_STAGES;
  return {
    minimumSeconds,
    timeReady,
    stagesReady,
    eligible: timeReady && stagesReady,
  };
}
export function scoringElapsedSeconds(
  timing: InterviewTiming,
  endedAt: string,
) {
  return Math.max(
    0,
    Math.min(
      timing.durationMinutes * 60,
      Math.round((Date.parse(endedAt) - Date.parse(timing.startedAt)) / 1000),
    ),
  );
}
