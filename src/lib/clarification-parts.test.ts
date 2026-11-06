import { expect, it } from "vitest";
import { clarificationParts } from "@/lib/clarification-parts";
import { configuredClarification } from "@/lib/configured-clarifications";
import { getProblem } from "@/lib/problems";

it("keeps independently asked parts rather than dropping an unmatched question", () => {
  const content =
    "What is the peak rate, and how should an unspecified audit export work?";
  expect(clarificationParts(content)).toEqual([
    "What is the peak rate",
    "how should an unspecified audit export work",
  ]);
  const problem = getProblem("notification-system");
  if (!problem) throw new Error("Missing problem");
  expect(configuredClarification(problem, "mid", content)?.complete).toBe(
    false,
  );
});
it("leaves a noun list intact and splits separate questions", () => {
  expect(
    clarificationParts("What traffic, latency and retention should I use?"),
  ).toHaveLength(1);
  expect(
    clarificationParts("What is the traffic? Is rebuffering bounded?"),
  ).toHaveLength(2);
});
