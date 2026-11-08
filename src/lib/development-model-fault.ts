import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { APIError } from "openai";
import { usesSharedStore } from "@/lib/beta-config";
import { logServerEvent } from "@/lib/server-events";

const faults = new AsyncLocalStorage<{ injected: boolean }>();
const enabled = () =>
  process.env.NODE_ENV === "development" &&
  !usesSharedStore() &&
  process.env.INTELIPREP_TEST_MODEL_503_ONCE === "1";

/** A server-configured, local-development-only fault, isolated to each chat request. */
export function withDevelopmentModelFault<T>(work: () => T): T {
  return enabled() ? faults.run({ injected: false }, work) : work();
}
export function injectDevelopmentModelFailure() {
  const fault = faults.getStore();
  if (!enabled() || !fault || fault.injected) return;
  fault.injected = true;
  logServerEvent({
    event: "model_test_fault",
    route: "/api/chat",
    kind: "local_503_once",
  });
  throw new APIError(
    503,
    { code: "local_test_503" },
    "Simulated local model failure",
    undefined,
  );
}
