"use client";
import type { RoundView } from "@/lib/play/public";
const entries = new Map<string, { view: RoundView; expires: number }>();
const key = (userId: string, sessionId: string) => userId + ":" + sessionId;
/** Only a public, owner-scoped view crosses the navigation. No answers or private variants. */
export function primeRound(userId: string, view: RoundView) {
  if (entries.size >= 10) entries.delete(entries.keys().next().value ?? "");
  entries.set(key(userId, view.sessionId), {
    view,
    expires: Date.now() + 60000,
  });
}
export function peekRound(userId: string, sessionId: string) {
  const name = key(userId, sessionId),
    entry = entries.get(name);
  if (!entry) return;
  if (entry.expires < Date.now()) {
    entries.delete(name);
    return;
  }
  return entry.view;
}
export function markRoundClick() {
  try {
    performance.mark("play-round-click");
  } catch {}
}
export function markRoundReady() {
  try {
    if (!performance.getEntriesByName("play-round-click").length) return;
    performance.measure("play-round-ready", "play-round-click");
    performance.clearMarks("play-round-click");
  } catch {}
}
