import { z } from "zod";

export function interviewHref(id?: string): string {
  return id ? `/interview?session=${encodeURIComponent(id)}` : "/interview";
}

export function interviewIdFromSearch(search: string): string | undefined {
  const result = z.uuid().safeParse(new URLSearchParams(search).get("session"));
  return result.success ? result.data : undefined;
}

/** A deep link restores that interview; a bare first load opens the newest created save. */
export function initialInterviewId(
  search: string,
  history: readonly { id: string }[],
): string | undefined {
  return interviewIdFromSearch(search) ?? history[0]?.id;
}
