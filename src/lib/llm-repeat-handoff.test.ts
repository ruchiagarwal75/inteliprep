import { afterEach, expect, it, vi } from "vitest";
import { streamInterviewerReply } from "@/lib/llm";
import { getProblem } from "@/lib/problems";
import type { InterviewContext } from "@/lib/interview-instructions";
const mock = vi.hoisted(() => ({
  unique: vi.fn(async (text: string) => text),
}));
vi.mock("@/lib/configured-clarifications", async (original) => ({
  ...(await original<typeof import("@/lib/configured-clarifications")>()),
  configuredClarification: () => ({
    complete: true,
    text: "Plan for 1,000 requests per second.",
    coveredCriteria: [],
  }),
}));
vi.mock("@/lib/unique-interviewer-reply", () => ({
  uniqueInterviewerReply: mock.unique,
}));
afterEach(() => vi.unstubAllEnvs());
it("keeps a new fact without repeating a drawing handoff already sent", async () => {
  vi.stubEnv("OPENAI_MODEL", "test-model");
  const problem = getProblem("single-server-scaling");
  if (!problem) throw Error("Missing problem");
  const context: InterviewContext = {
    problem,
    level: "senior",
    phase: problem.phases[1],
    progress: {
      step: "invite-drawing",
      candidateTurns: 5,
      discussionTurnLimit: 2,
    },
  };
  let reply = "";
  for await (const part of streamInterviewerReply(
    [
      { role: "assistant", content: problem.drawingPolicy.invitation },
      { role: "user", content: "How much traffic is expected?" },
    ],
    "",
    "",
    undefined,
    undefined,
    context,
  ))
    reply += part;
  expect(reply).toBe("Plan for 1,000 requests per second.");
  expect(reply).not.toContain("whiteboard");
});
