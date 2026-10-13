import { z } from "zod";

export function interviewHref(id?: string): string {
  return id ? `/interview?session=${encodeURIComponent(id)}` : "/interview";
}

export function interviewIdFromSearch(search: string): string | undefined {
  const result = z.uuid().safeParse(new URLSearchParams(search).get("session"));
  return result.success ? result.data : undefined;
}
