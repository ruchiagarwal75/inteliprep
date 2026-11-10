import { expect, it } from "vitest";
import { getProblem } from "@/lib/problems";
import { pendingRequirementsQuestion } from "@/lib/requirements-reply";
import type { InterviewContext } from "@/lib/interview-instructions";
it("asks a standalone service-goal question after sign-in is clarified", () => {
  const problem = getProblem("url-shortener");
  if (!problem) throw Error("Missing problem");
  const context: InterviewContext = {
    problem,
    level: "senior",
    phase: problem.phases[0],
    coveredCriteria: [0],
    progress: { step: "discussion", candidateTurns: 1, discussionTurnLimit: 3 },
  };
  const question = pendingRequirementsQuestion(context, [
    {
      role: "user",
      content: "Do users need to sign in to follow a short link?",
    },
  ]);
  expect(question).toContain("for this service");
  expect(question).not.toMatch(/discussed|previous|earlier/iu);
  for (const asked of [question, problem.phases[0].clarificationQuestions?.[1]])
    expect(
      pendingRequirementsQuestion(context, [
        { role: "assistant", content: asked ?? "" },
        {
          role: "user",
          content: "I would target low latency and high availability.",
        },
      ]),
    ).toBeUndefined();
});
