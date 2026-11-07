import { expect, it } from "vitest";
import { interviewerState } from "@/lib/interviewer-state";
import { getProblem } from "@/lib/problems";
it("keeps server stage and pace guidance separate from the stable prompt", () => {
  const problem = getProblem("url-shortener");
  if (!problem) throw Error("Missing problem");
  const state = interviewerState({
    problem,
    level: "mid",
    phase: problem.phases[2],
    coveredCriteria: [0],
    progress: { step: "review", candidateTurns: 5, discussionTurnLimit: 3 },
  });
  expect(state).toContain(problem.phases[2].goal);
  expect(state).toContain('"covered_criterion_indexes":[0]');
  expect(state).toContain("allowed_follow_ups");
  expect(state).not.toContain(problem.phases[3].interviewerGuidance);
});
