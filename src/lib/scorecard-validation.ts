import "server-only";
import type { InterviewLevel } from "@/lib/interview-selection";
import type { InterviewEndSnapshot } from "@/lib/interview-end";
import { candidateQuotes } from "@/lib/scorecard-quotes";
import { getProblem, type ProblemDefinition } from "@/lib/problems";
import {
  gradingAssessmentSchema,
  scorecardSchema,
  type ScoreEvidence,
  type Scorecard,
  type GradingAssessment,
} from "@/lib/scorecard";
import { calibrateBottleneckScore } from "@/lib/scorecard-calibration";
import { isMeaningfulFinding } from "@/lib/grading-evidence";

function resolveEvidence(
  evidence: GradingAssessment["areas"][number]["evidence"][number],
  snapshot: InterviewEndSnapshot,
  quotes: ReturnType<typeof candidateQuotes>,
): ScoreEvidence {
  if (evidence.kind === "message") {
    const quote = quotes.find((item) => item.quoteId === evidence.quoteId);
    if (!quote)
      throw new Error("Grading evidence referenced an unknown candidate quote");
    return {
      kind: "message",
      messageIndex: quote.messageIndex,
      quote: quote.quote,
    };
  }
  if (
    !snapshot.scene?.elements.some(
      (element) =>
        !element.isDeleted &&
        element.type !== "selection" &&
        element.id === evidence.elementId,
    )
  )
    throw new Error("Grading evidence referenced a missing diagram element");
  return evidence;
}

/** Reject invented quotes, interviewer credit, and missing or duplicated rubric areas. */
export function validateScorecard(
  problem: ProblemDefinition,
  level: InterviewLevel,
  snapshot: InterviewEndSnapshot,
  endedAt: string,
  assessment: unknown,
): Scorecard {
  const result = gradingAssessmentSchema.parse(assessment);
  const quotes = candidateQuotes(snapshot.messages);
  const indexes = new Set(result.areas.map((area) => area.areaIndex));
  if (
    result.areas.length !== problem.rubric.length ||
    indexes.size !== problem.rubric.length ||
    result.areas.some((area) => area.areaIndex >= problem.rubric.length)
  )
    throw new Error("Grading did not cover the configured rubric areas");
  for (const area of result.areas) {
    if (area.score === null && area.evidence.length)
      throw new Error("Unassessed areas must not carry grading evidence");
    if (area.score !== null && !area.evidence.length)
      throw new Error("Numeric scores require grading evidence");
  }
  const next = getProblem(result.nextProblemId);
  if (!next) throw new Error("Grading suggested an unknown practice problem");
  if (result.gaps.some((finding) => !isMeaningfulFinding(finding.text)))
    throw new Error(
      "Each gap must describe a specific actionable issue, not an evidence label",
    );
  return calibrateBottleneckScore(
    scorecardSchema.parse({
      problemId: problem.id,
      problemTitle: problem.title,
      level,
      endedAt,
      summary: result.summary,
      signal: result.areas.some((area) => area.score === null)
        ? "insufficient_evidence"
        : result.signal,
      areas: [...result.areas]
        .sort((a, b) => a.areaIndex - b.areaIndex)
        .map(({ areaIndex, ...area }) => ({
          area: problem.rubric[areaIndex].area,
          ...area,
          evidence: area.evidence.map((item) =>
            resolveEvidence(item, snapshot, quotes),
          ),
        })),
      strengths: result.strengths.map((finding) => ({
        ...finding,
        evidence: finding.evidence.map((item) =>
          resolveEvidence(item, snapshot, quotes),
        ),
      })),
      gaps: result.gaps.map((finding) => ({
        ...finding,
        evidence: finding.evidence.map((item) =>
          resolveEvidence(item, snapshot, quotes),
        ),
      })),
      nextPractice: {
        problemId: next.id,
        title: next.title,
        focus: result.practiceFocus,
      },
    }),
  );
}

export function emptyInterviewScorecard(
  problem: ProblemDefinition,
  level: InterviewLevel,
  endedAt: string,
  hasDrawing = false,
): Scorecard {
  return validateScorecard(problem, level, { messages: [] }, endedAt, {
    summary: hasDrawing
      ? "Your drawing was saved, but there is no technical explanation to assess its intent or reasoning. There isn't enough evidence to assess your design yet."
      : "The interview ended before you provided a technical answer. There isn't enough evidence to assess your design yet.",
    signal: "insufficient_evidence",
    areas: problem.rubric.map((_, areaIndex) => ({
      areaIndex,
      score: null,
      rationale: "This area wasn't assessed before the interview ended.",
      evidence: [],
    })),
    strengths: [],
    gaps: [],
    nextProblemId: problem.id,
    practiceFocus:
      "Try the exercise again: clarify requirements, draw your approach, and explain the choices behind it.",
  });
}
