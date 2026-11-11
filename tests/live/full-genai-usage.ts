import type { calls } from "./model-meter";

/** Missing usage remains unknown, including on failed or retried calls. */
export function fullInterviewUsage(
  observations: Pick<
    (typeof calls)[number],
    "estimatedUsd" | "normalizedUsage"
  >[],
) {
  const priced = observations.filter((c) => c.estimatedUsd !== null);
  const knownEstimatedUsd = priced.reduce(
    (sum, c) => sum + (c.estimatedUsd ?? 0),
    0,
  );
  const unpricedCalls = observations.length - priced.length;
  const usage = observations.flatMap((c) =>
    c.normalizedUsage ? [c.normalizedUsage] : [],
  );
  return {
    modelCalls: observations.length,
    knownInputTokens: usage.reduce((s, u) => s + u.inputTokens, 0),
    knownOutputTokens: usage.reduce((s, u) => s + u.outputTokens, 0),
    cachedInputTokens: usage.reduce((s, u) => s + u.cachedTokens, 0),
    usageUnavailableCalls: observations.length - usage.length,
    knownEstimatedUsd,
    estimatedUsd: unpricedCalls ? null : knownEstimatedUsd,
    unpricedCalls,
  };
}
