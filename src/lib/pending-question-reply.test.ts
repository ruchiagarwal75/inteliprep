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
  expect(fallback).not.toBe(original);
  expect(fallback).toContain("allocate distinct counter values in Cassandra");
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
  expect(resumePendingQuestion(mismatch, [])).toContain("which is intended?");
});
it("never uses fresh topic IDs or a malformed generated question as copy", () => {
  const fresh = { ...pending, topicId: "fresh:1a2b3c4d|permissions_check" };
  const reply = resumePendingQuestion(
    fresh,
    messages,
    "Explain fresh:1a2b3c4d?",
    fresh.id,
  );
  expect(reply).toContain("allocate distinct counter values");
  expect(reply).not.toMatch(/fresh:|\||permissions_check/);
});
