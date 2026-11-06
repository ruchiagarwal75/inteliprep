import "server-only";
import { APIError } from "openai";
import { setTimeout as delay } from "node:timers/promises";
import { logServerEvent } from "@/lib/server-events";

export function transientModelFailure(cause: unknown): boolean {
  return (
    cause instanceof APIError &&
    ((cause.status !== undefined &&
      [408, 500, 502, 503, 504].includes(cause.status)) ||
      ["APIConnectionError", "APIConnectionTimeoutError"].includes(cause.name))
  );
}

/** At most one retry, only before visible output; no retries for auth, limits or bad input. */
export async function* retryInterviewerReply(
  generate: (signal: AbortSignal) => AsyncGenerator<string>,
  signal: AbortSignal,
) {
  const budget = AbortSignal.any([signal, AbortSignal.timeout(85_000)]);
  for (let attempt = 0; attempt < 2; attempt++) {
    let emitted = false;
    try {
      for await (const delta of generate(budget)) {
        if (delta) emitted = true;
        yield delta;
      }
      return;
    } catch (cause) {
      if (attempt || emitted || budget.aborted || !transientModelFailure(cause))
        throw cause;
      logServerEvent(
        {
          event: "model_retry",
          route: "/api/chat",
          kind: "transient_before_output",
        },
        cause,
      );
      await delay(250, undefined, { signal: budget });
    }
  }
}
