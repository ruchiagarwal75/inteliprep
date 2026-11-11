import { expect, it, vi } from "vitest";
import type { ChatMessage } from "@/lib/chat";
import { genaiEngineFixture } from "@/lib/fixtures/genai-engine-test";
import {
  eligibleDiscussionProbes,
  cappedGenaiQuestions,
} from "@/lib/genai-probe-memory";
import { genaiDiscussionQuotes } from "@/lib/genai-discussion-quotes";
import { enqueueQuestion } from "@/lib/open-question-queue";
import { discussionReply } from "@/lib/discussion-reply";
import type { InterviewContext } from "@/lib/interview-instructions";
const model = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: model,
}));
const problem = genaiEngineFixture();
const cache = problem.reviewProbes[0];
const evaluation = problem.reviewProbes[1];
it("never revives an exhausted GenAI issue, including on a named topic request", () => {
  const memory = {
    askedQuestions: [],
    coveredTopics: [],
    topicTurns: { "mmq7-cache": 2 },
  };
  expect(eligibleDiscussionProbes("genai", [cache], memory, "cache")).toEqual(
    [],
  );
  expect(
    eligibleDiscussionProbes("genai", [cache, evaluation], memory),
  ).toEqual([evaluation]);
  expect(eligibleDiscussionProbes("core", [cache], memory)).toEqual([]);
});
it("excludes a verified covered issue from generation and fallback", () => {
  expect(
    eligibleDiscussionProbes("genai", [cache, evaluation], {
      askedQuestions: [],
      coveredTopics: [cache.question],
    }),
  ).toEqual([evaluation]);
});
it("retires two-attempt questions without awarding coverage", () => {
  const queue = enqueueQuestion([], cache.question, 0, "cache");
  expect(cappedGenaiQuestions("genai", queue, [], { cache: 2 })).toEqual({
    questions: [],
    retired: [queue[0].id],
  });
  expect(
    cappedGenaiQuestions("genai", queue, [
      { role: "assistant", content: cache.question },
      { role: "assistant", content: cache.question },
    ]),
  ).toEqual({ questions: [], retired: [queue[0].id] });
  expect(
    cappedGenaiQuestions("genai", queue, [], { cache: 1 }).questions,
  ).toEqual(queue);
  expect(
    cappedGenaiQuestions("core", queue, [], { cache: 2 }).questions,
  ).toEqual([]);
});
it("retains exact evidence from an explanation outside the latest-nine-message window", () => {
  const messages: ChatMessage[] = [
    {
      role: "user",
      content:
        "My cache key contains the user ID and ACL version, preventing cross-user reuse.",
    },
    ...Array.from({ length: 20 }, () => ({
      role: "user" as const,
      content: "The other request path is independent.",
    })),
  ];
  const quotes = genaiDiscussionQuotes(messages);
  expect(
    quotes.some((q) => q.messageIndex === 0 && q.quote.includes("ACL version")),
  ).toBe(true);
  const huge = Array.from({ length: 100 }, () => ({
    role: "user" as const,
    content: "cache details ".repeat(500),
  }));
  expect(
    new TextEncoder().encode(JSON.stringify(genaiDiscussionQuotes(huge)))
      .byteLength,
  ).toBeLessThanOrEqual(48_002);
});
it("uses earlier evidence to close an already-answered pending question and rejects its regenerated repeat", async () => {
  const messages: ChatMessage[] = [
    {
      role: "user",
      content:
        "The cache fails closed when unavailable; requests never bypass their user permissions.",
    },
    ...Array.from({ length: 12 }, () => ({
      role: "user" as const,
      content: "Other design details remain unchanged.",
    })),
    { role: "assistant", content: cache.question },
    { role: "user", content: "I explained that earlier." },
  ];
  const queue = enqueueQuestion([], cache.question, 13, "cache");
  const state: InterviewContext = {
    problem,
    level: "senior",
    phase: problem.phases[3],
    designText: "API cache",
    openQuestions: queue,
    answeredQuestionIds: [],
    questionMemory: { askedQuestions: [cache.question], coveredTopics: [] },
  };
  model.mockResolvedValueOnce({
    status: "completed",
    output_text: JSON.stringify({
      topicId: "mmq7-cache",
      question: cache.question,
      acknowledgement: "",
      acknowledgementQuote: "",
      continuesQuestionId: "",
      answers: [{ questionId: queue[0].id, quoteId: "m0q0" }],
      covered: [{ topicId: "mmq7-cache", quoteId: "m0q0" }],
    }),
  });
  const reply = await discussionReply(messages, state, {
    summary: "API -> cache",
    changes: "",
  });
  expect(state.answeredQuestionIds).toContain(queue[0].id);
  expect(reply).not.toContain(cache.question);
  expect(reply).toContain(evaluation.question);
  expect(JSON.stringify(model.mock.lastCall?.[1].input)).toContain(
    "fails closed",
  );
});
it("keeps a partial answer open and asks only a concrete unresolved gap", async () => {
  const question = "How does the cache keep two employees' answers separate?";
  const queue = enqueueQuestion([], question, 0, "cache");
  const messages: ChatMessage[] = [
    { role: "assistant", content: question },
    { role: "user", content: "I use a cache." },
  ];
  const state: InterviewContext = {
    problem,
    level: "senior",
    phase: problem.phases[3],
    designText: "cache",
    openQuestions: queue,
    answeredQuestionIds: [],
    questionMemory: {
      askedQuestions: [question],
      coveredTopics: [],
      topicTurns: { "mmq7-cache": 1 },
    },
  };
  const gap =
    "Which fields in the cache key distinguish employees with different access?";
  model.mockResolvedValueOnce({
    status: "completed",
    output_text: JSON.stringify({
      topicId: "mmq7-cache",
      question: gap,
      acknowledgement: "",
      acknowledgementQuote: "",
      continuesQuestionId: queue[0].id,
      answers: [],
      covered: [],
    }),
  });
  expect(
    await discussionReply(messages, state, { summary: "cache", changes: "" }),
  ).toBe(gap);
  expect(state.answeredQuestionIds).toEqual([]);
});
