import type { Scorecard } from "@/lib/scorecard";
import type { InterviewTiming } from "@/lib/interview-timer";
import {
  scoringEligibility,
  scoringElapsedSeconds,
} from "@/lib/scoring-eligibility";

/** Observations need diagnostic reasoning; supplied traffic targets are not a diagnosis. */
export function calibrateBottleneckScore(card: Scorecard): Scorecard {
  if (card.problemId !== "single-server-scaling") return card;
  const areas = card.areas.map((area) => {
    if (
      area.area !== "Find the bottleneck" ||
      area.score === null ||
      area.score < 3
    )
      return area;
    const quotes = area.evidence.flatMap((item) =>
      item.kind === "message" ? [item.quote] : [],
    );
    const diagnostic = quotes.some(
      (quote) =>
        /\b(cpu|processor|memory|ram|disk|i\/o|database|queries|query|network|profil\w*|saturat\w*|resource usage|slow (?:request|operation)|trace\w*)\b/iu.test(
          quote,
        ) &&
        /\b(measur\w*|check\w*|monitor\w*|profil\w*|test\w*|bottleneck|limit\w*|saturat\w*|utilization|cause|bound|slow|load)\b/iu.test(
          quote,
        ),
    );
    return diagnostic
      ? area
      : {
          ...area,
          score: 2,
          rationale:
            "The cited evidence states performance goals but does not identify a limiting resource or explain how to diagnose it. Connect measurements of a resource or slow operation to the suspected bottleneck.",
        };
  });
  const changed = areas.some((area, index) => area !== card.areas[index]);
  return {
    ...card,
    areas,
    signal:
      changed && (card.signal === "yes" || card.signal === "strong_yes")
        ? "insufficient_evidence"
        : card.signal,
  };
}

/** A brief attempt can show useful evidence without supporting a full interview signal. */
export function withSessionContext(
  card: Scorecard,
  timing?: InterviewTiming,
  answeredStageCount?: number,
): Scorecard {
  if (!timing) return card;

  const allowedSeconds = timing.durationMinutes * 60;
  const elapsedSeconds = scoringElapsedSeconds(timing, card.endedAt);
  const limited = !scoringEligibility(
    timing.durationMinutes,
    elapsedSeconds,
    answeredStageCount,
  ).eligible;
  return {
    ...card,
    areas: limited
      ? card.areas.map((area) => ({ ...area, score: null }))
      : card.areas,
    signal: limited ? "insufficient_evidence" : card.signal,
    session: {
      startedAt: timing.startedAt,
      elapsedSeconds,
      allowedSeconds,
      limited,
      note: limited
        ? "Scores show after you've used at least a third of the time and answered in two stages."
        : "Area feedback reflects the evidence provided during this session. Unexplored areas remain unassessed.",
    },
  };
}
