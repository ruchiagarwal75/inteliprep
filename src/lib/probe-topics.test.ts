import { expect, it } from "vitest";
import {
  availableTopicProbes,
  probeTopic,
  stageTopicCounts,
} from "@/lib/probe-topics";
import { getProblem } from "@/lib/problems";
it("moves from three cache probes to uncovered ID topics and respects an explicit named topic", () => {
  const problem = getProblem("url-shortener");
  if (!problem) throw Error("Missing problem");
  const probes = problem.reviewProbes.filter((p) => p.stageIndex === 2);
  const next = availableTopicProbes(probes, { cache: 3 });
  expect(next.some((p) => probeTopic(p) === "cache")).toBe(false);
  expect(next.some((p) => probeTopic(p) === "id_allocation")).toBe(true);
  expect(
    availableTopicProbes(probes, { cache: 3 }, "negative cache").some(
      (p) => probeTopic(p) === "cache",
    ),
  ).toBe(true);
});
it("keeps turn budgets separate for each stage", () => {
  expect(
    stageTopicCounts({ "core:cache": 3, "scaling:cache": 1 }, "core"),
  ).toEqual({ cache: 3 });
});
