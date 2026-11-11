import {
  nextProblemInTrack,
  parseProblemTrack,
  problemTrack,
  problemsInTrack,
} from "@/lib/problem-track";
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
export const briefTrackKey = (userId: string) =>
  `mockmeai:brief-track:v1:${userId}`;
export function briefDefaults(
  problems: ProblemSummary[],
  latest?: SavedInterview,
  summary?: SavedInterviewSummary,
  storedLevel?: unknown,
  requestedProblem?: string | null,
  storedTrack?: unknown,
  requestedTrack?: string | null,
  requestedLevel?: string | null,
) {
  const lastProblem = latest?.interview.problemId ?? summary?.problemId;
  const requested = problems.find((p) => p.problemId === requestedProblem);
  const previous = problems.find((p) => p.problemId === lastProblem);
  const track = requested
    ? problemTrack(requested)
    : (parseProblemTrack(requestedTrack) ??
      parseProblemTrack(storedTrack) ??
      problemTrack(previous));
  const choices = problemsInTrack(problems, track);
  const suggested =
    latest?.scorecard?.nextPractice.problemId ??
    (summary?.hasEnded && lastProblem
      ? nextProblemInTrack(problems, lastProblem)?.problemId
      : lastProblem);
  const problemId =
    [requested?.problemId, suggested, choices[0]?.problemId].find((id) =>
      choices.some((p) => p.problemId === id),
    ) ?? "single-server-scaling";
  const fromLink = interviewLevelSchema.safeParse(requestedLevel);
  const parsed = fromLink.success
    ? fromLink
    : interviewLevelSchema.safeParse(storedLevel);
  const level = parsed.success
    ? parsed.data
    : (latest?.interview.level ?? summary?.level ?? "mid");
  return { problemId, level, durationMinutes: 45 as const };
}
