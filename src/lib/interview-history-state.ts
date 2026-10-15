import type { SavedInterviewSummary } from "@/lib/saved-interview";
import { remainingInterviewSeconds } from "@/lib/interview-timer";

export type HistoryInterviewState = {
  status: "in_progress" | "expired" | "ended" | "saved";
  elapsedSeconds?: number;
};

/** An unopened save's deadline continues to run; history never claims it is still live after expiry. */
export function historyInterviewState(
  entry: SavedInterviewSummary,
  clientNow: number,
): HistoryInterviewState {
  if (entry.hasEnded)
    return {
      status: "ended",
      elapsedSeconds: Math.max(
        0,
        Math.min(
          entry.elapsedSeconds,
          entry.timing
            ? entry.timing.durationMinutes * 60
            : entry.elapsedSeconds,
        ),
      ),
    };
  if (!entry.timing) return { status: "saved" };
  const allowedSeconds = entry.timing.durationMinutes * 60;
  const remaining = Math.min(
    allowedSeconds,
    remainingInterviewSeconds(
      entry.timing,
      clientNow + (entry.clockOffsetMs ?? 0),
    ),
  );
  return {
    status: remaining === 0 ? "expired" : "in_progress",
    elapsedSeconds: allowedSeconds - remaining,
  };
}
