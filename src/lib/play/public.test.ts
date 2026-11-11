import { expect, it } from "vitest";
import {
  submitRoundSchema,
  startRoundInputSchema,
  advanceRoundSchema,
} from "./public";
it("accepts answers and identifiers, never client-authored outcomes or timing", () => {
  const input = {
    attemptId: crypto.randomUUID(),
    answer: { type: "math", value: 10, unit: "GB" },
  };
  expect(submitRoundSchema.safeParse(input).success).toBe(true);
  for (const extra of [
    { correct: true },
    { points: 100 },
    { timeMs: 1 },
    { userId: crypto.randomUUID() },
  ])
    expect(submitRoundSchema.safeParse({ ...input, ...extra }).success).toBe(
      false,
    );
  expect(
    submitRoundSchema.safeParse({
      ...input,
      answer: { ...input.answer, correct: true },
    }).success,
  ).toBe(false);
  expect(
    startRoundInputSchema.safeParse({
      requestId: crypto.randomUUID(),
      mode: "level",
      topic: "rag",
      level: 1,
      timeZone: "America/Los_Angeles",
    }).success,
  ).toBe(true);
  expect(
    startRoundInputSchema.safeParse({
      requestId: crypto.randomUUID(),
      mode: "placement",
      topic: "rag",
      level: 1,
      timeZone: "UTC",
    }).success,
  ).toBe(false);
  expect(
    advanceRoundSchema.safeParse({
      sessionId: crypto.randomUUID(),
      afterAttemptId: crypto.randomUUID(),
      passed: true,
    }).success,
  ).toBe(false);
});
