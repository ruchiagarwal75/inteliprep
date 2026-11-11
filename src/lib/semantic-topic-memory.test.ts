import { beforeEach, expect, it, vi } from "vitest";
import { refreshSemanticTopicMemory } from "@/lib/semantic-topic-memory";
import { getProblem } from "@/lib/problems";
import { enqueueQuestion } from "@/lib/open-question-queue";
import { eligibleDiscussionProbes } from "@/lib/genai-probe-memory";
import type { InterviewContext } from "@/lib/interview-instructions";
const model = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: model,
}));
const problem = getProblem("enterprise-rag-assistant");
if (!problem) throw Error("Missing problem");
const context = (): InterviewContext => ({
  problem,
  level: "senior",
  phase: problem.phases[3],
  questionMemory: { askedQuestions: [], coveredTopics: [], topicTurns: {} },
});
beforeEach(() => model.mockReset());
it.each([
  {
    id: "mmq7-injection",
    question: "A document tells the model to list salary files. What happens?",
    answer:
      "Passages are inert citations; connector text never acquires authority to perform an operation, so the embedded salary request is discarded.",
  },
  {
    id: "mmq7-revoke",
    question: "What happens before the next permission sync after a removal?",
    answer:
      "Each request checks the current membership revision with the access service; if it cannot be checked, the answer is withheld until the revision is verified.",
  },
])(
  "closes $id by meaning even when the quote lacks the topic regex",
  async ({ id, question, answer }) => {
    const state = context();
    state.openQuestions = enqueueQuestion([], question, 0, id);
    model.mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify({
        covered: [{ topicId: id, quoteId: "m1q0" }],
        asked: [{ messageIndex: 0, topicId: id }],
      }),
    });
    await refreshSemanticTopicMemory(
      [
        { role: "assistant", content: question },
        { role: "user", content: answer },
      ],
      state,
    );
    expect(state.questionMemory?.coveredTopics).toContain("issue:" + id);
    expect(state.openQuestions).toEqual([]);
    expect(
      eligibleDiscussionProbes(
        "genai",
        problem.reviewProbes,
        state.questionMemory,
      ).some((p) => p.id === id),
    ).toBe(false);
  },
);
it("does not accept invented evidence or question indexes", async () => {
  const state = context();
  model.mockResolvedValueOnce({
    status: "completed",
    output_text: JSON.stringify({
      covered: [{ topicId: "mmq7-injection", quoteId: "made-up" }],
      asked: [{ messageIndex: 99, topicId: "mmq7-injection" }],
    }),
  });
  await refreshSemanticTopicMemory(
    [{ role: "user", content: "I use guardrails." }],
    state,
  );
  expect(state.questionMemory?.coveredTopics).toEqual([]);
  expect(state.questionMemory?.topicTurns).toEqual({});
});
