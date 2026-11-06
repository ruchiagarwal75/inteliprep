import { expect, it } from "vitest";
import { normalizeSharedFacts } from "@/lib/shared-facts";
import { sharedRequirementCriteria } from "@/lib/configured-clarifications";
import { getProblem } from "@/lib/problems";
it("normalizes numeric shorthand and latency units without changing their values", () => {
  expect(
    normalizeSharedFacts(
      "100K users; 1 million reads; 500 ms and 0.5 seconds; 5s",
    ),
  ).toBe("100000 users; 1000000 reads; 500ms and 500ms; 5000ms");
  expect(normalizeSharedFacts("100,000,000 users")).toBe("100000000 users");
});
it.each([
  ["mid", "100k users; freshness within 5 seconds and p95 reads below 500 ms."],
  [
    "mid",
    "P95 reads below 0.5 seconds, new posts visible in 5s, with 1 million feed reads per day.",
  ],
  ["senior", "10 million DAU, p95 reads 500ms, feed updates within 5 seconds."],
  [
    "staff",
    "100,000,000 users; freshness 5 seconds; 500 milliseconds p95 reads.",
  ],
] as const)(
  "recognizes shared %s goals in different wording/order: %s",
  (level, content) => {
    const p = getProblem("news-feed");
    if (!p) throw new Error("Missing problem");
    expect(
      sharedRequirementCriteria(p, level, [
        { role: "assistant", content },
      ]).sort(),
    ).toEqual([0, 1, 2]);
  },
);
it("does not credit candidate-only or incorrect service numbers as interviewer facts", () => {
  const p = getProblem("news-feed");
  if (!p) throw new Error("Missing problem");
  expect(
    sharedRequirementCriteria(p, "mid", [
      {
        role: "assistant",
        content: "100k users, 900 ms reads and 9 second freshness.",
      },
    ]),
  ).toEqual([0, 2]);
  expect(
    sharedRequirementCriteria(p, "mid", [
      { role: "user", content: "100k users, 500ms and 5 seconds." },
    ]),
  ).toEqual([0, 2]);
});
