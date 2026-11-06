export type InterviewIdentity = {
  id: string;
  problemId: string;
  createdAt: string;
};

/** Recency belongs to the attempt's creation, never a later autosave or scorecard. */
export function compareInterviewRecency(
  a: InterviewIdentity,
  b: InterviewIdentity,
) {
  return (
    Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
    a.id.localeCompare(b.id)
  );
}

export function latestInterviews<T extends InterviewIdentity>(
  entries: readonly T[],
): T[] {
  const latest = new Map<string, T>();
  for (const entry of entries) {
    const current = latest.get(entry.problemId);
    if (!current || compareInterviewRecency(entry, current) < 0)
      latest.set(entry.problemId, entry);
  }
  return [...latest.values()].sort(compareInterviewRecency);
}
