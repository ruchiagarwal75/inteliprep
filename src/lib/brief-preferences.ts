import {
  interviewLevelSchema,
  type ProblemSummary,
} from "@/lib/interview-selection";
import type {
  SavedInterview,
  SavedInterviewSummary,
} from "@/lib/saved-interview";
export const briefLevelKey = (userId: string) =>
  `mockmeai:brief-level:v1:${userId}`;
export function briefDefaults(
  problems: ProblemSummary[],
  latest?: SavedInterview,
  summary?: SavedInterviewSummary,
  storedLevel?: unknown,
  requestedProblem?: string | null,
) {
  const lastProblem = latest?.interview.problemId ?? summary?.problemId;
  const index = problems.findIndex((p) => p.problemId === lastProblem);
  const suggested =
    latest?.scorecard?.nextPractice.problemId ??
    (summary?.hasEnded && index >= 0
      ? problems[(index + 1) % problems.length]?.problemId
      : lastProblem);
  const problemId =
    [requestedProblem, suggested, problems[0]?.problemId].find((id) =>
      problems.some((p) => p.problemId === id),
    ) ?? "single-server-scaling";
  const parsed = interviewLevelSchema.safeParse(storedLevel);
  const level = parsed.success
    ? parsed.data
    : (latest?.interview.level ?? summary?.level ?? "mid");
  return { problemId, level, durationMinutes: 45 as const };
}
