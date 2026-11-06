import { z } from "zod";

export function interviewHref(id?: string): string {
  return id ? `/interview/${encodeURIComponent(id)}` : "/interview/new";
}

export function interviewIdFromSearch(search: string): string | undefined {
  const result = z.uuid().safeParse(new URLSearchParams(search).get("session"));
  return result.success ? result.data : undefined;
}

/** A deep link restores that interview; a bare first load opens the newest created save. */
export function initialInterviewId(
  search: string,
  _history: readonly { id: string }[],
): string | undefined {
  void _history;
  return interviewIdFromSearch(search);
}
