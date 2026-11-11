/** Public names stay consistent even when reopening an older saved interview. */
export const INTERVIEW_STAGE_NAMES = [
  "Clarify requirements",
  "Draw and explain",
  "Core design",
  "Scaling and reliability",
  "Tradeoffs and wrap-up",
] as const;

export function interviewStageName(
  position: number,
  fallback = "Interview",
  names: readonly string[] = INTERVIEW_STAGE_NAMES,
) {
  return names[position - 1] ?? fallback;
}
