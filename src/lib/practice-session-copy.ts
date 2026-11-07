import type { SavedInterviewSummary } from "@/lib/saved-interview";
import type { HistoryInterviewState } from "@/lib/interview-history-state";

/** Display-only copy; stored status, timestamps and scorecards are untouched. */
export function friendlySessionDate(value: string, now: number) {
  const date = new Date(value);
  const today = new Date(now);
  const yesterday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1,
  );
  const day =
    date.toDateString() === today.toDateString()
      ? "Today"
      : date.toDateString() === yesterday.toDateString()
        ? "Yesterday"
        : date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            ...(date.getFullYear() !== today.getFullYear()
              ? { year: "numeric" }
              : {}),
          });
  return `${day}, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}
export function attemptCount(count: number) {
  return `${count} ${count === 1 ? "attempt" : "attempts"}`;
}
export function sessionStatusCopy(
  entry: SavedInterviewSummary,
  state: HistoryInterviewState,
) {
  if (entry.signal === "insufficient_evidence") return "Too short to score";
  if (entry.closedWithoutScoring) return "Closed";
  if (entry.gradingError) return "Feedback unavailable";
  if (entry.hasEnded)
    return entry.hasScorecard ? "Completed" : "Feedback pending";
  return state.status === "expired"
    ? "Time expired"
    : state.status === "saved"
      ? "Saved"
      : "In progress";
}
