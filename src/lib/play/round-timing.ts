import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { logServerEvent } from "@/lib/server-events";
const phaseNames = [
  "guardMs",
  "dbAcquireMs",
  "dbLockMs",
  "dbWorkMs",
  "dbFinishMs",
] as const;
type Phase = (typeof phaseNames)[number];
type Timing = Record<Phase, number> & {
  started: number;
  firstRoundRequest: boolean;
  roundPath?: "fresh" | "resume";
};
const context = new AsyncLocalStorage<Timing>();
let firstRoundRequest = true;
export function roundGuardComplete() {
  const timing = context.getStore();
  if (timing) timing.guardMs = performance.now() - timing.started;
}
export function recordRoundTime(phase: Phase, ms: number) {
  const timing = context.getStore();
  if (timing) timing[phase] += ms;
}
export function roundTimingPath(path: "fresh" | "resume") {
  const timing = context.getStore();
  if (timing) timing.roundPath = path;
}
/** Counts application time only. Vercel startup before invocation and network time are outside this clock. */
export function withRoundTiming(work: () => Promise<Response>) {
  const timing: Timing = {
    started: performance.now(),
    firstRoundRequest,
    guardMs: 0,
    dbAcquireMs: 0,
    dbLockMs: 0,
    dbWorkMs: 0,
    dbFinishMs: 0,
  };
  firstRoundRequest = false;
  return context.run(timing, async () => {
    const response = await work(),
      durationMs = performance.now() - timing.started;
    if (!timing.roundPath) timing.guardMs = durationMs;
    response.headers.append(
      "Server-Timing",
      [
        ...phaseNames.map(
          (phase) => `${phase};dur=${timing[phase].toFixed(1)}`,
        ),
        `app;dur=${durationMs.toFixed(1)}`,
      ].join(", "),
    );
    logServerEvent({
      event: "play_round_timing",
      requestId: response.headers.get("X-Request-Id") ?? undefined,
      route: "/api/play/round",
      status: response.status,
      durationMs,
      firstRoundRequest: timing.firstRoundRequest,
      roundPath: timing.roundPath,
      ...Object.fromEntries(phaseNames.map((phase) => [phase, timing[phase]])),
    });
    return response;
  });
}
