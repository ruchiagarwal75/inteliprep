import Link from "next/link";
import type { Scorecard } from "@/lib/scorecard";
import {
  elapsedInWords,
  scoringMinimumInWords,
  DESIGN_EXPLANATION_RULE,
} from "@/lib/scoring-copy";
export function ShortInterviewResult({ scorecard }: { scorecard: Scorecard }) {
  const session = scorecard.session;
  return (
    <section className="scorecard-content" aria-label="Interview not scored">
      <h2>
        {scorecard.notScoredReason === "too_short"
          ? "Too short to score"
          : "Not enough evidence to score"}
      </h2>
      {session && (
        <p>
          You practiced for {elapsedInWords(session.elapsedSeconds)}. Interviews
          need at least {scoringMinimumInWords(session.allowedSeconds / 60)} to
          get a score. {DESIGN_EXPLANATION_RULE}
        </p>
      )}
      {scorecard.summary ===
        "You ended before giving a technical answer. Retry to get feedback." && (
        <p>{scorecard.summary}</p>
      )}
      <p>Your transcript and drawing are saved.</p>
      <Link
        className="practice-primary"
        href={`/interview/new?problem=${encodeURIComponent(scorecard.problemId)}`}
      >
        Start a new interview
      </Link>
    </section>
  );
}
