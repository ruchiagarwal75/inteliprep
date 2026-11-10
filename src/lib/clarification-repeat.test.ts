import { expect, it, vi } from "vitest";
import { getProblem } from "@/lib/problems";
import { questionAtEnd } from "@/lib/open-question";
import type { ChatMessage } from "@/lib/chat";
import type { InterviewContext } from "@/lib/interview-instructions";
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: vi.fn(() => {
    throw Error("Configured facts should not require the model");
  }),
}));
import { streamInterviewerReply } from "@/lib/llm";
it("does not append the same pending question to consecutive configured clarifications", async () => {
  const problem = getProblem("rate-limiter");
  if (!problem) throw Error("Missing problem");
  const context: InterviewContext = {
    problem,
    level: "senior",
    phase: problem.phases[0],
    coveredCriteria: [0, 1],
    progress: { step: "discussion", candidateTurns: 1, discussionTurnLimit: 3 },
  };
  const history: ChatMessage[] = [
    {
      role: "assistant",
      content: "Which requirements would you clarify first?",
    },
  ];
  const replies: string[] = [];
  for (const content of [
    "Is authentication in scope?",
    "Is API-key issuance already provided?",
  ]) {
    history.push({ role: "user", content });
    let reply = "";
    for await (const part of streamInterviewerReply(
      history,
      "No drawing",
      "No changes",
      undefined,
      undefined,
      context,
    ))
      reply += part;
    replies.push(reply);
    history.push({ role: "assistant", content: reply });
  }
  expect(questionAtEnd(replies[0])).toBeTruthy();
  expect(questionAtEnd(replies[1])).toBeTruthy();
  expect(questionAtEnd(replies[1])).not.toBe(questionAtEnd(replies[0]));
});
