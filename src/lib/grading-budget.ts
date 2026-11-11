import type { ProblemTrack } from "@/lib/interview-selection";

/** Leave time to return/persist feedback before the route and shared lease expire. */
export const SCORECARD_FETCH_TIMEOUT_MS = 195_000;
export const INTERVIEW_SESSION_LOCK_MS = 240_000;
export function gradingModelBudgetMs(track: ProblemTrack) {
  return track === "genai" ? 180_000 : 120_000;
}
