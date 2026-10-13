import "server-only";
import type { InterviewEndSnapshot } from "@/lib/interview-end";
import { candidateQuotes } from "@/lib/scorecard-quotes";
import {
  gradingAssessmentSchema,
  type GradingAssessment,
} from "@/lib/scorecard";
import { getProblem, type ProblemDefinition } from "@/lib/problems";
import { isMeaningfulFinding } from "@/lib/grading-evidence";
import { areaWasExplored } from "@/lib/grading-opportunity";

/** Unsupported scores become unassessed; no fabricated reference can reach public feedback. */
export function repairGradingAssessment(
  problem: ProblemDefinition,
  snapshot: InterviewEndSnapshot,
  assessment: unknown,
): GradingAssessment {
  const result = gradingAssessmentSchema.parse(assessment);
  const quotes = new Set(
    candidateQuotes(snapshot.messages).map((item) => item.quoteId),
  );
  const elements = new Set(
    snapshot.scene?.elements
      .filter((element) => !element.isDeleted && element.type !== "selection")
      .map((element) => element.id),
  );
  const verified = (evidence: GradingAssessment["areas"][number]["evidence"]) =>
    evidence.filter((item) =>
      item.kind === "message"
        ? quotes.has(item.quoteId)
        : elements.has(item.elementId),
    );
  const explored = problem.rubric.map((_, index) =>
    areaWasExplored(problem, index, snapshot),
  );
  let unsupported = false;
  const areas = result.areas.map((area) => {
    const evidence = verified(area.evidence);
    const unasked = explored[area.areaIndex] === false;
    if (area.score !== null && (!evidence.length || unasked)) {
      unsupported = true;
      return {
        ...area,
        score: null,
        evidence: [],
        rationale: unasked
          ? `${problem.rubric[area.areaIndex]?.area} was not discussed before the interview ended, so this area is not assessed.`
          : "There isn't enough supported candidate evidence to assess this area.",
      };
    }
    return { ...area, evidence: area.score === null ? [] : evidence };
  });
  const findings = (kind: "strengths" | "gaps") =>
    result[kind].flatMap((finding) => {
      const evidence = verified(finding.evidence);
      if (
        !evidence.length ||
        (kind === "gaps" &&
          (!isMeaningfulFinding(finding.text) ||
            problem.rubric.some(
              (area, index) =>
                !explored[index] &&
                area.assessmentPattern &&
                new RegExp(area.assessmentPattern, "iu").test(finding.text),
            )))
      )
        return [];
      return [{ ...finding, evidence }];
    });
  return {
    ...result,
    areas,
    strengths: findings("strengths"),
    gaps: findings("gaps"),
    summary: unsupported
      ? "Feedback covers the areas supported by your answers and final drawing. Other areas were not assessed before the interview ended."
      : result.summary,
    signal: areas.some((area) => area.score === null)
      ? "insufficient_evidence"
      : result.signal,
    nextProblemId: getProblem(result.nextProblemId)
      ? result.nextProblemId
      : problem.id,
  };
}
