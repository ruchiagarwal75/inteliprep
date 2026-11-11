import { afterEach, expect, it, vi } from "vitest";
import { streamInterviewerReply } from "@/lib/llm";
import { getProblem } from "@/lib/problems";
import type { InterviewContext } from "@/lib/interview-instructions";
const mock = vi.hoisted(() => ({ discussion: vi.fn() }));
vi.mock("@/lib/discussion-reply", () => ({ discussionReply: mock.discussion }));
afterEach(() => vi.unstubAllEnvs());
it("keeps final-stage questions inside the structured topic-memory path", async () => {
  vi.stubEnv("OPENAI_MODEL", "gpt-6.1-terra");
  const problem = getProblem("single-server-scaling");
  if (!problem) throw Error("Missing problem");
  const context: InterviewContext = {
    problem,
    level: "senior",
    phase: problem.phases[4],
    progress: { step: "review", candidateTurns: 20, discussionTurnLimit: 2 },
  };
  mock.discussion.mockResolvedValue(
    "Which tradeoff would make you reverse that decision?",
  );
  let reply = "";
  for await (const part of streamInterviewerReply(
    [
      {
        role: "user",
        content:
          "I would persist a version before changing its visible pointer.",
      },
    ],
    "",
    "",
    undefined,
    undefined,
    context,
  ))
    reply += part;
  expect(mock.discussion).toHaveBeenCalledOnce();
  expect(reply).toBe("Which tradeoff would make you reverse that decision?");
});
