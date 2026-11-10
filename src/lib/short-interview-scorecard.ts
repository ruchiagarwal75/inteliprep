import "server-only";
import type { ProblemDefinition } from "@/lib/problems";
import type { InterviewLevel } from "@/lib/interview-selection";
import { emptyInterviewScorecard } from "@/lib/scorecard-validation";
export function shortInterviewScorecard(
  problem: ProblemDefinition,
  level: InterviewLevel,
  endedAt: string,
  reason: "too_short" | "insufficient_stages",
  hasAnswer: boolean,
) {
  const card = emptyInterviewScorecard(problem, level, endedAt);
  return {
    ...card,
    notScoredReason: reason,
    summary: hasAnswer
      ? "No score was generated for this session."
      : card.summary,
    strengths: [],
    gaps: [],
  };
}
