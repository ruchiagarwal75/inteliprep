import {
  formatInterviewTime,
  type InterviewDuration,
} from "@/lib/interview-timer";
import { scoringEligibility } from "@/lib/scoring-eligibility";
import {
  scoringMinimumInWords,
  DESIGN_EXPLANATION_RULE,
} from "@/lib/scoring-copy";

export function InterviewTimer({
  remainingSeconds,
  ended,
  expired,
  testMode,
  durationMinutes,
}: {
  remainingSeconds: number;
  ended: boolean;
  expired: boolean;
  testMode: boolean;
  durationMinutes?: InterviewDuration;
}) {
  const gate =
    durationMinutes !== undefined
      ? scoringEligibility(
          durationMinutes,
          durationMinutes * 60 - remainingSeconds,
        )
      : undefined;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span>{testMode ? "Test timer" : "Time left"}</span>
      <span
        role="timer"
        aria-label="Interview time remaining"
        className={`font-mono text-base font-semibold tabular-nums ${remainingSeconds <= (testMode ? 15 : 300) && !ended ? "text-danger" : ""}`}
      >
        {ended ? "Ended" : formatInterviewTime(remainingSeconds)}
      </span>
      {!ended && gate && !gate.timeReady && (
        <span className="w-full text-xs text-[var(--ink-muted)]">
          Scores need at least {scoringMinimumInWords(durationMinutes ?? 45)}.{" "}
          {DESIGN_EXPLANATION_RULE}
        </span>
      )}
      {!expired && !ended && remainingSeconds <= (testMode ? 15 : 300) && (
        <p role="status" className="text-warning">
          {remainingSeconds <= 60
            ? "Less than a minute. Send your final answer soon."
            : "5 minutes left. Finish your explanation and send your final answer."}
        </p>
      )}
      {expired && !ended && (
        <p role="status" className="text-warning w-full text-xs">
          Time is up. Your drawing and unsent answer are preserved.
        </p>
      )}
    </div>
  );
}
