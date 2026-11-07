export type DurationRecord = {
  status: "unfinished" | "completed" | "exited" | "failed";
  startedAt: string | null;
  lastActivityAt: string | null;
  endedAt: string | null;
};
/** There is no timed pause in this app: drawing pauses questions, not the interview clock. */
export function elapsedInterviewTime(record: DurationRecord) {
  const start = record.startedAt ? Date.parse(record.startedAt) : NaN;
  const end =
    record.status === "unfinished" ? record.lastActivityAt : record.endedAt;
  const endpoint = end ? Date.parse(end) : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(endpoint) || endpoint < start)
    return { seconds: null, label: "Unavailable: timing was not recorded" };
  return {
    seconds:
      record.status === "completed"
        ? validCompletedSeconds(record)
        : Math.floor((endpoint - start) / 1000),
    label:
      record.status === "unfinished"
        ? "Elapsed so far through last recorded activity (estimate)"
        : "Elapsed interview time",
  };
}
export function validCompletedSeconds(record: DurationRecord) {
  if (record.status !== "completed" || !record.endedAt || !record.startedAt)
    return null;
  const duration = Date.parse(record.endedAt) - Date.parse(record.startedAt);
  return Number.isFinite(duration) && duration >= 0
    ? Math.floor(duration / 1000)
    : null;
}
