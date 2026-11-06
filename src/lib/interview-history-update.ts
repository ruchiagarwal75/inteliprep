import type { SavedInterviewSummary } from "@/lib/saved-interview";

/** A committed save updates its row without rereading every saved drawing and PNG. */
export function updateInterviewHistory(
  entries: SavedInterviewSummary[],
  saved: SavedInterviewSummary,
): SavedInterviewSummary[] {
  return [...entries.filter((entry) => entry.id !== saved.id), saved].sort(
    (a, b) =>
      Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
      a.id.localeCompare(b.id),
  );
}
