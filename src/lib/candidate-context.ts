import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

const identity = new AsyncLocalStorage<string>();

export function withCandidateIdentity<T>(id: string, work: () => T): T {
  return identity.run(id, work);
}

/** Request-scoped verified identity, including asynchronous stream callbacks. */
export function currentCandidateId(): string | undefined {
  return identity.getStore();
}
