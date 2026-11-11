import { expect, it } from "vitest";
import { getProblem } from "@/lib/problems";
import { globalTopicCounts } from "@/lib/topic-memory";
it("combines a topic's asks across stages and reads legacy keys", () => {
  const problem = getProblem("enterprise-rag-assistant");
  if (!problem) throw Error("Missing problem");
  const counts = globalTopicCounts(
    {
      [problem.phases[2].id + ":injection"]: 1,
      [problem.phases[3].id + ":injection"]: 1,
    },
    problem,
  );
  expect(counts["mmq7-injection"]).toBe(2);
  expect(
    globalTopicCounts(
      { injection: 1, [problem.phases[3].id + ":injection"]: 1 },
      problem,
    )["mmq7-injection"],
  ).toBe(2);
});
