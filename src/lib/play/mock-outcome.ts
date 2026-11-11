import "server-only";
import type { Scorecard } from "@/lib/scorecard";
/** The existing grader decides the bar. Play only normalizes its published scores. */
export function mockOutcome(card: Scorecard) {
  if (
    card.notScoredReason ||
    !card.session ||
    card.session.limited ||
    card.signal === "insufficient_evidence"
  )
    return null;
  const scores = card.areas.flatMap((area) =>
    area.score === null ? [] : [area.score],
  );
  if (!scores.length) return null;
  return {
    points: Math.round(
      (100 * scores.reduce((sum, score) => sum + score, 0)) /
        (4 * scores.length),
    ),
    meetsBar: card.signal === "yes" || card.signal === "strong_yes",
  };
}
