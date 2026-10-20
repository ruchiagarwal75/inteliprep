import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { BetaUnavailableError, isPrivateBeta } from "@/lib/beta-config";
import type { Session } from "@/lib/interview-session-store";

const requests = new AsyncLocalStorage<Map<string, Session>>();
const local = globalThis as typeof globalThis & {
  inteliprepSessions?: Map<string, Session>;
};

/** Async stream work keeps this scope until completion; it is never shared by requests. */
export function withInterviewSessionContext<T>(work: () => T): T {
  return isPrivateBeta() ? requests.run(new Map(), work) : work();
}

export function interviewSessionState(): Map<string, Session> {
  const request = requests.getStore();
  if (request) return request;
  // Beta code must never fall back to the development process cache.
  if (isPrivateBeta()) throw new BetaUnavailableError();
  return (local.inteliprepSessions ??= new Map());
}
