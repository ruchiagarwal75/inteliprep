import { expect, it } from "vitest";
import {
  clarificationContinuation,
  estimationAsk,
} from "@/lib/clarification-continuation";
it("offers another clarification without repeating the last prompt", () => {
  const first = clarificationContinuation([], "mid");
  expect(first).toMatch(/\?$/u);
  expect(
    clarificationContinuation([{ role: "assistant", content: first }], "mid"),
  ).not.toBe(first);
});
it("asks advanced candidates to derive request rates instead of changing the subject", () => {
  const messages = [
    { role: "user" as const, content: "What QPS should I design for?" },
  ];
  for (const level of ["senior", "staff"] as const)
    expect(estimationAsk(messages, level)).toContain("estimate");
  expect(estimationAsk(messages, "mid")).toBeUndefined();
});
it("asks about a capacity estimate without inventing a numeric answer", () => {
  expect(
    estimationAsk(
      [{ role: "user", content: "How much storage should I provision?" }],
      "senior",
    ),
  ).toMatch(/capacity.*estimate/u);
});

it.each([
  "How much memory should I provision for counters?",
  "How much RAM is needed?",
  "How much disk do we need?",
  "What storage capacity should I plan for?",
  "How much bandwidth should I provision?",
  "How large should the cache be?",
  "How many machines are needed?",
  "What server count should I estimate?",
])("keeps Senior resource estimation with the candidate: %s", (content) => {
  expect(estimationAsk([{ role: "user", content }], "senior")).toMatch(
    /estimat/iu,
  );
  expect(estimationAsk([{ role: "user", content }], "mid")).toBeUndefined();
});
it.each([
  "I estimate 11,600 creates per second on average from 10 million creates per day.",
  "For 100,000 keys I estimate 6 to 7 MB, assuming 64 bytes per counter entry.",
])(
  "requires a reasoning follow-up for a volunteered estimate: %s",
  (content) => {
    const ask = estimationAsk([{ role: "user", content }], "senior");
    expect(ask).toMatch(/estimate again.*units/u);
    expect(ask).not.toMatch(/116|86,?400|conversion/u);
  },
);

it("keeps the estimate acknowledgement without duplicating the appended request to redo it", async () => {
  const { withoutQuestions } = await import("@/lib/drawing-reply");
  expect(
    withoutQuestions("That estimate looks off. Please redo it with units."),
  ).toBe("That estimate looks off.");
});

it.each([
  "I would budget 7MB for the counters.",
  "I estimate 11,600 creates/s from 10 million creates per day.",
])("recognizes compact volunteered units: %s", (content) => {
  expect(estimationAsk([{ role: "user", content }], "senior")).toMatch(
    /estimate again.*units/u,
  );
});
