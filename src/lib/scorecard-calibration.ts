import type { Scorecard } from "@/lib/scorecard";
import type { InterviewTiming } from "@/lib/interview-timer";

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
): Scorecard {
  if (!timing) return card;
  const allowedSeconds = timing.durationMinutes * 60;
  const elapsedSeconds = Math.max(
    0,
    Math.min(
      allowedSeconds,
      Math.round(
        (Date.parse(card.endedAt) - Date.parse(timing.startedAt)) / 1000,
      ),
    ),
  );
  const limited =
    elapsedSeconds < Math.min(600, allowedSeconds / 2) ||
    timing.durationMinutes === 1;
  return {
    ...card,
    signal: limited ? "insufficient_evidence" : card.signal,
    session: {
      startedAt: timing.startedAt,
      elapsedSeconds,
      allowedSeconds,
      limited,
      note:
        timing.durationMinutes === 1
          ? "This was a 1-minute test session. Area feedback is provisional; there is not enough interview time for an overall signal."
          : limited
            ? "This brief attempt provides limited evidence for a full interview. Area feedback reflects only the answers given; no overall signal is assigned."
            : "Area feedback reflects the evidence provided during this session. Unexplored areas remain unassessed.",
    },
  };
}
