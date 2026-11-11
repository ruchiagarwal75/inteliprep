import { beforeEach, expect, it, vi } from "vitest";
import { freshDiscussionQuestion } from "@/lib/fresh-discussion-question";
import { genaiEngineFixture } from "@/lib/fixtures/genai-engine-test";
import type { InterviewContext } from "@/lib/interview-instructions";
const model = vi.hoisted(() => vi.fn());
const novelty = vi.hoisted(() => vi.fn());
vi.mock("@/lib/design-question-novelty", () => ({
  isNewDesignBoundary: novelty,
}));
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: model,
}));
const problem = genaiEngineFixture();
const messages = [
  {
    role: "assistant" as const,
    content: "What happens if your cache is unavailable?",
  },
  {
    role: "user" as const,
    content:
      "The cache falls back to an authorized fresh retrieval when it is down.",
  },
];
const context = (): InterviewContext => ({
  problem,
  level: "senior",
  phase: problem.phases[3],
  designText: "cache",
  questionMemory: {
    askedQuestions: [messages[0].content],
    coveredTopics: [],
    topicTurns: { "mmq7-cache": 1 },
  },
});
const response = (question: string, quoteId = "m1q0") => ({
  status: "completed",
  output_text: JSON.stringify({
    topicId: "mmq7-cache",
    question,
    quoteId,
    exhausted: false,
  }),
});
beforeEach(() => {
  model.mockReset();
  novelty.mockReset().mockResolvedValue(true);
});
it("writes a distinct design-specific question after the bank sentence was used", async () => {
  const state = context();
  model.mockResolvedValueOnce(
    response(
      "How does authorized retrieval behave if its permission source is also unavailable?",
    ),
  );
  expect(await freshDiscussionQuestion(messages, state)).toContain(
    "permission source",
  );
  expect(state.selectedTopic).toMatch(/^fresh:[a-f0-9]{16}$/u);
});
it("rejects repeated sentences and invented grounding, then asks for a fresh alternative", async () => {
  model
    .mockResolvedValueOnce(response(messages[0].content))
    .mockResolvedValueOnce(
      response(
        "How is the failed cache repopulated without serving revoked content?",
      ),
    );
  expect(await freshDiscussionQuestion(messages, context())).toContain(
    "repopulated",
  );
  expect(model).toHaveBeenCalledTimes(2);
  model
    .mockReset()
    .mockResolvedValue(
      response("How is the failed cache repopulated?", "invented"),
    );
  expect(await freshDiscussionQuestion(messages, context())).toBeUndefined();
});

it("looks beyond exhausted bank issues for a distinct design boundary", async () => {
  const state = context();
  state.questionMemory = {
    askedQuestions: [messages[0].content],
    coveredTopics: ["issue:mmq7-cache"],
    topicTurns: { "mmq7-cache": 2 },
  };
  model.mockResolvedValueOnce(
    response("How would permission-source loss affect recovery of this cache?"),
  );
  expect(await freshDiscussionQuestion(messages, state)).toContain(
    "permission-source",
  );
  expect(state.selectedTopic).toMatch(/^fresh:/u);
  expect(state.questionMemory.topicTurns?.["mmq7-cache"]).toBe(2);
  expect(novelty).toHaveBeenCalledOnce();
});
it("rejects a semantically answered or previously asked boundary", async () => {
  novelty.mockResolvedValue(false);
  model.mockResolvedValue(
    response("How would the cache handle becoming unavailable?"),
  );
  expect(await freshDiscussionQuestion(messages, context())).toBeUndefined();
});
