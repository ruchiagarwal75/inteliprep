import { formatInterviewTime } from "@/lib/interview-timer";

export function InterviewTimer({
  remainingSeconds,
  ended,
  expired,
  testMode,
}: {
  remainingSeconds: number;
  ended: boolean;
  expired: boolean;
  testMode: boolean;
}) {
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
