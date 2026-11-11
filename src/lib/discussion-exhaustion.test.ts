import { beforeEach, expect, it, vi } from "vitest";
import { continueDiscussion } from "@/lib/discussion-exhaustion";
import { getProblem } from "@/lib/problems";
import type { InterviewContext } from "@/lib/interview-instructions";
const generate = vi.hoisted(() => vi.fn());
vi.mock("@/lib/fresh-discussion-question", () => ({
  freshDiscussionQuestion: generate,
}));
beforeEach(() => generate.mockReset());
function context(index: number): InterviewContext {
  const problem = getProblem("enterprise-rag-assistant");
  if (!problem) throw Error("Missing problem");
  return {
    problem,
    level: "senior",
    phase: problem.phases[index],
    coveredCriteria: [0],
  };
}
it("uses a new design question before moving stages", async () => {
  const state = context(2);
  generate.mockResolvedValueOnce(
    "What happens when the parser rejects a table?",
  );
  expect(await continueDiscussion([], state)).toContain("parser");
  expect(state.advancedPhaseIndex).toBeUndefined();
});
it("leaves an exhausted stage early without awarding coverage", async () => {
  const state = context(2);
  generate
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce(
      "How is the revoked permission propagated during an outage?",
    );
  await continueDiscussion([], state);
  expect(state.advancedPhaseIndex).toBe(3);
  expect(state.phase?.id).toBe(state.problem.phases[3].id);
  expect(state.coveredCriteria).toEqual([]);
});
it("never advances through clarification, drawing or multiple stages on exhaustion", async () => {
  generate.mockResolvedValue(undefined);
  for (const index of [0, 1, 4])
    await expect(continueDiscussion([], context(index))).rejects.toThrow(
      "new question",
    );
  const state = context(2);
  await expect(continueDiscussion([], state)).rejects.toThrow();
  expect(state.advancedPhaseIndex).toBe(3);
});
