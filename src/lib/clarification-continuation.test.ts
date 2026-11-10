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
