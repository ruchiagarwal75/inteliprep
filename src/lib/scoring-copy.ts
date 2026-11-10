import {
  MIN_SCORED_STAGES,
  scoringThresholdSeconds,
} from "@/lib/scoring-eligibility";
export function durationInWords(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  if (!minutes)
    return `${Math.ceil(seconds)} ${seconds === 1 ? "second" : "seconds"}`;
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}
export function elapsedInWords(seconds: number) {
  return seconds < 60 ? "less than a minute" : durationInWords(seconds);
}
export const DESIGN_EXPLANATION_RULE = `Explain how your design works in at least ${MIN_SCORED_STAGES} parts of the interview, such as your walkthrough and the discussion.`;
export function scoringMinimumInWords(durationMinutes: number) {
  return durationInWords(scoringThresholdSeconds(durationMinutes));
}
