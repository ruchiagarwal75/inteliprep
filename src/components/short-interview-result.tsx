import Link from "next/link";
import type { Scorecard } from "@/lib/scorecard";
import { formatInterviewTime } from "@/lib/interview-timer";
import {
  scoringThresholdSeconds,
  MIN_SCORED_STAGES,
} from "@/lib/scoring-eligibility";
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
          You practiced for {formatInterviewTime(session.elapsedSeconds)}.
          Scores require at least{" "}
          {formatInterviewTime(
            scoringThresholdSeconds(session.allowedSeconds / 60),
          )}{" "}
          of interview time and technical answers in {MIN_SCORED_STAGES} stages.
        </p>
      )}
      {scorecard.summary ===
        "You ended before giving a technical answer. Retry to get feedback." && (
        <p>{scorecard.summary}</p>
      )}
      <p>Your transcript and drawing are saved. No AI grading was requested.</p>
      <Link
        className="practice-primary"
        href={`/interview/new?problem=${encodeURIComponent(scorecard.problemId)}`}
      >
        Start a new interview
      </Link>
    </section>
  );
}
