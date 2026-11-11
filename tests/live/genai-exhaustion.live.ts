import { expect, it, vi } from "vitest";
import { getProblem } from "@/lib/problems";
import { continueDiscussion } from "@/lib/discussion-exhaustion";
import { repeatedInterviewerSentences } from "@/lib/reply-novelty";
import type { ChatMessage } from "@/lib/chat";
import type { InterviewContext } from "@/lib/interview-instructions";
vi.mock("@/lib/observed-model-request", async () => import("./observed-live"));
it("writes a fresh RAG design question after the core bank has been asked", async () => {
  const problem = getProblem("enterprise-rag-assistant");
  if (!problem) throw Error("Missing problem");
  const bank = problem.reviewProbes.filter((p) => p.stageIndex === 2);
  const messages: ChatMessage[] = [
    ...bank.map((p) => ({ role: "assistant" as const, content: p.question })),
    {
      role: "user",
      content:
        "Connectors version chunks in both keyword and vector indexes. The retrieval filter checks current group memberships before reranking. A context builder assigns source IDs, verifies every claim against retrieved passages and abstains below a confidence threshold calibrated on human labels. PDF tables keep their headings with each row.",
    },
  ];
  const state: InterviewContext = {
    problem,
    level: "senior",
    phase: problem.phases[2],
    designText: "Connector vector index ACL filter reranker context builder",
    questionMemory: {
      askedQuestions: bank.map((p) => p.question),
      coveredTopics: [],
    },
  };
  const reply = await continueDiscussion(messages, state);
  expect(reply).toMatch(/[?？]$/u);
  expect(repeatedInterviewerSentences(reply, messages)).toEqual([]);
  expect(reply).not.toMatch(/Pause to draw|Please explain one tradeoff/iu);
});
