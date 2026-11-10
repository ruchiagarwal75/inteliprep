import { expect, it } from "vitest";
import { resumePendingQuestion } from "@/lib/pending-question-reply";
import { enqueueQuestion } from "@/lib/open-question-queue";
const original = "How would you allocate distinct counter values in Cassandra?";
const pending = enqueueQuestion([], original, 0, "id_allocation")[0];
const messages = [{ role: "assistant" as const, content: original }];
it("accepts a rephrased ask only for the verified pending ID", () => {
  const next =
    "What prevents two API instances from claiming the same counter range?";
  expect(resumePendingQuestion(pending, messages, next, pending.id)).toBe(next);
  expect(resumePendingQuestion(pending, messages, next, "invented")).not.toBe(
    next,
  );
});
it("never emits the original or last question word for word", () => {
  const fallback = resumePendingQuestion(
    pending,
    messages,
    original,
    pending.id,
  );
  expect(fallback).not.toContain(original);
  expect(fallback).toContain("ID allocation");
  expect(
    resumePendingQuestion(pending, [
      ...messages,
      { role: "assistant", content: "That cache choice is noted. " + fallback },
    ]),
  ).not.toBe(fallback);
});
it("keeps a diagram clarification on the unresolved discrepancy", () => {
  const mismatch = enqueueQuestion(
    [],
    "You said PostgreSQL but drew Cassandra DB. Which is intended?",
    0,
    "diagram_consistency",
  )[0];
  expect(resumePendingQuestion(mismatch, [])).toContain("Which version");
});
