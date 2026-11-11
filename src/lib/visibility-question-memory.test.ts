import { afterEach, expect, it, vi } from "vitest";
import { createInterviewStart, getProblem } from "@/lib/problems";
import { prepareInterviewTurn } from "@/lib/interview-turn";
import { getCachedSession } from "@/lib/interview-session-store";
import type { ChatMessage } from "@/lib/chat";
import type { InterviewContext } from "@/lib/interview-instructions";
import { enqueueQuestion } from "@/lib/open-question-queue";
vi.mock("@/lib/semantic-topic-memory", () => ({
  refreshSemanticTopicMemory: vi.fn(
    async (_messages: ChatMessage[], context: InterviewContext) => {
      context.openQuestions = [];
    },
  ),
}));
afterEach(() => vi.unstubAllEnvs());
it("does not resume an already answered question after a whiteboard side question", async () => {
  vi.stubEnv("OPENAI_MODEL", "gpt-6.1-terra");
  const problem = getProblem("enterprise-rag-assistant");
  if (!problem) throw Error("Missing problem");
  const started = createInterviewStart(problem, "senior", 45);
  const session = getCachedSession(started.sessionId);
  if (!session) throw Error("Missing session");
  const question =
    "What happens before the next permission sync after a removal?";
  session.phaseIndex = 2;
  session.openQuestions = enqueueQuestion([], question, 0, "revoke");
  const turn = await prepareInterviewTurn(
    problem,
    {
      ...started,
      messages: [
        {
          role: "user",
          content: "Done explaining",
          action: "review",
          source: "control",
        },
        { role: "assistant", content: question },
        {
          role: "user",
          content:
            "Every request checks current group membership with the authority before retrieving any content.",
        },
        { role: "user", content: "Can you see my whiteboard?" },
      ],
      scene: { elements: [] },
    },
    new AbortController().signal,
  );
  try {
    expect(turn.context.reviewQuestion).not.toContain(question);
    expect(turn.context.continuedQuestionId).toBeUndefined();
    expect(turn.context.selectedTopic).toBeUndefined();
  } finally {
    turn.release();
  }
});
