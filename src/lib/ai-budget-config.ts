import "server-only";
/** Shared Production budget, UTC day. These are dollars for the whole app. */
export const AI_BUDGET = {
  warningUsd: 5,
  capUsd: 25,
  mockReserveUsd: 2,
  scorecardReserveUsd: 0.75,
  legacyUnknownCallUsd: 0.75,
} as const;
export class AiBudgetError extends Error {
  constructor(public readonly status: 429 | 503 = 429) {
    super(
      status === 429
        ? "Today's shared AI budget is allocated. Your work is saved. Please try again after midnight UTC."
        : "AI spending checks are temporarily unavailable. Your work is saved. Please try again later.",
    );
  }
  get retryAfter() {
    const now = new Date();
    return Math.max(
      1,
      Math.ceil(
        (Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + 1,
        ) -
          now.getTime()) /
          1000,
      ),
    );
  }
}
