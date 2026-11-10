import {
  formatInterviewTime,
  type InterviewDuration,
} from "@/lib/interview-timer";
import {
  scoringEligibility,
  MIN_SCORED_STAGES,
} from "@/lib/scoring-eligibility";

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
        className={`font-mono text-base font-semibold tabular-nums ${remainingSeconds <= (testMode ? 15 : 300) && !ended ? "text-red-600 dark:text-red-400" : ""}`}
      >
        {ended ? "Ended" : formatInterviewTime(remainingSeconds)}
      </span>
      {!ended && gate && !gate.timeReady && (
        <span className="w-full text-xs text-[var(--ink-muted)]">
          Scoring starts at {formatInterviewTime(gate.minimumSeconds)} of
          interview time, with technical answers in {MIN_SCORED_STAGES} stages.
        </span>
      )}
      {!expired && !ended && remainingSeconds <= (testMode ? 15 : 300) && (
        <p role="status" className="text-amber-700 dark:text-amber-300">
          {remainingSeconds <= 60
            ? "Less than a minute. Send your final answer soon."
            : "5 minutes left. Finish your explanation and send your final answer."}
        </p>
      )}
      {expired && !ended && (
        <p
          role="status"
          className="w-full text-xs text-amber-700 dark:text-amber-300"
        >
          Time is up. Your drawing and unsent answer are preserved.
        </p>
      )}
    </div>
  );
}
