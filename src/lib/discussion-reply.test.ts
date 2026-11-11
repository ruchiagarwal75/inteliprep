import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { discussionReply } from "@/lib/discussion-reply";
import { getProblem } from "@/lib/problems";
import { candidateQuotes } from "@/lib/scorecard-quotes";
const create = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: create,
}));
const problem = getProblem("url-shortener");
if (!problem) throw Error("Missing problem");
const context = {
  problem,
  level: "mid" as const,
  phase: problem.phases[2],
  questionMemory: { askedQuestions: [], coveredTopics: [] as string[] },
};
const messages = [
  { role: "assistant" as const, content: "How are IDs allocated?" },
  {
    role: "user" as const,
    content:
      "Each API leases a disjoint range and allocates IDs from its local counter.",
  },
];
const board = {
  summary: "Nodes: API service, ZooKeeper, Cassandra DB",
  changes: "Added: ZooKeeper",
};
beforeEach(() => {
  vi.stubEnv("OPENAI_MODEL", "gpt-6.1-sol");
  create.mockReset();
  context.questionMemory.coveredTopics = [];
});
afterEach(() => vi.unstubAllEnvs());
it("uses one structured call with a stable problem/rubric prefix and current diagram", async () => {
  create.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify({
      topicId: "concurrent-create",
      question: "How does a crashed allocator avoid reusing its remaining IDs?",
      acknowledgement: "Disjoint ranges separate the allocators.",
      continuesQuestionId: "",
      acknowledgementQuote: messages[1].content,
      answers: [],
      covered: [],
    }),
  });
  const reply = await discussionReply(messages, context, board);
  expect(create).toHaveBeenCalledOnce();
  expect(reply).toContain("crashed allocator");
  const request = create.mock.calls[0][1];
  expect(request).toMatchObject({
    reasoning: { effort: "low" },
    text: { format: { type: "json_schema", strict: true } },
  });
  expect(request.instructions).toContain(problem.rubric[1].strong);
  expect(request.instructions).not.toContain(messages[1].content);
  expect(request.input[0].role).toBe("developer");
  expect(request.input[1].content).toContain("ZooKeeper");
  await discussionReply(
    [...messages, { role: "user", content: "Unused IDs are never reused." }],
    context,
    board,
  );
  expect(create.mock.calls[1][1].instructions).toBe(request.instructions);
});
it("checks coverage references and replaces repeated or malformed output with a specific stage probe", async () => {
  const memory = {
    ...context,
    questionMemory: { askedQuestions: [], coveredTopics: [] as string[] },
  };
  create.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify({
      topicId: "concurrent-create",
      question: messages[0].content,
      acknowledgement: "",
      continuesQuestionId: "",
      acknowledgementQuote: "",
      answers: [],
      covered: [{ topicId: "id-encoding", quoteId: "invented" }],
    }),
  });
  const reply = await discussionReply(messages, memory, board);
  expect(reply).not.toContain(messages[0].content);
  expect(reply).toMatch(/\?$/);
  expect(memory.questionMemory.coveredTopics).toEqual([]);
  create.mockResolvedValue({ status: "completed", output_text: "broken JSON" });
  expect(await discussionReply(messages, memory, board)).toMatch(/\?$/);
});
it("accepts only real candidate evidence for covered topics", async () => {
  const memory = {
    ...context,
    questionMemory: { askedQuestions: [], coveredTopics: [] as string[] },
  };
  const quoteId = candidateQuotes(messages)[0].quoteId;
  create.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify({
      topicId: "id-encoding",
      question: "How do numeric IDs become base62 codes?",
      acknowledgement: "",
      continuesQuestionId: "",
      acknowledgementQuote: "",
      answers: [],
      covered: [{ topicId: "concurrent-create", quoteId }],
    }),
  });
  await discussionReply(messages, memory, board);
  expect(memory.questionMemory.coveredTopics).toContain(
    problem.reviewProbes[0].question,
  );
});

it("returns the oldest unanswered question after a side response, then advances only on cited evidence", async () => {
  const { enqueueQuestion } = await import("@/lib/open-question-queue");
  const queue = enqueueQuestion(
    [],
    "How are distinct IDs allocated?",
    0,
    "id_allocation",
  );
  const state = {
    ...context,
    openQuestions: queue,
    answeredQuestionIds: [] as string[],
  };
  const value = {
    topicId: "id-encoding",
    question: "How do IDs become base62 codes?",
    acknowledgement: "",
    continuesQuestionId: "",
    acknowledgementQuote: "",
    covered: [],
    answers: [] as { questionId: string; quoteId: string }[],
  };
  create.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify(value),
  });
  const resumed = await discussionReply(messages, state, board);
  expect(resumed).not.toContain(queue[0].question);
  expect(resumed).toContain("how are distinct IDs allocated?");
  expect(state).toHaveProperty("continuedQuestionId", queue[0].id);
  value.answers = [
    { questionId: queue[0].id, quoteId: candidateQuotes(messages)[0].quoteId },
  ];
  create.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify(value),
  });
  expect(await discussionReply(messages, state, board)).toContain("base62");
  expect(state.answeredQuestionIds).toContain(queue[0].id);
});
it("excludes an exhausted cache topic from structured generation", async () => {
  create.mockResolvedValue({ status: "completed", output_text: "bad JSON" });
  await discussionReply(
    messages,
    {
      ...context,
      questionMemory: {
        askedQuestions: [],
        coveredTopics: [],
        topicTurns: { cache: 3 },
      },
    },
    board,
  );
  const state = JSON.parse(
    create.mock.calls[0][1].input[0].content.split("\n\n").at(-1),
  );
  expect(
    state.allowed_follow_ups.some((p: { question: string }) =>
      /cache/iu.test(p.question),
    ),
  ).toBe(false);
  expect(
    state.allowed_follow_ups.some((p: { question: string }) =>
      /ID|counter|base62/u.test(p.question),
    ),
  ).toBe(true);
});
it("queues a diagram mismatch only after the prior answer is verified", async () => {
  const { enqueueQuestion } = await import("@/lib/open-question-queue");
  const queue = enqueueQuestion([], messages[0].content, 0);
  const state = {
    ...context,
    openQuestions: queue,
    answeredQuestionIds: [] as string[],
    diagramQuestion:
      "You said PostgreSQL but drew Cassandra DB; which is intended?",
  };
  const body = {
    topicId: "id-encoding",
    question: "How do IDs become short codes?",
    acknowledgement: "",
    continuesQuestionId: "",
    acknowledgementQuote: "",
    covered: [],
    answers: [
      {
        questionId: queue[0].id,
        quoteId: candidateQuotes(messages)[0].quoteId,
      },
    ],
  };
  create.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify(body),
  });
  expect(await discussionReply(messages, state, board)).toBe(
    state.diagramQuestion,
  );
  expect(state.answeredQuestionIds).toEqual([queue[0].id]);
});

it("acknowledges a detour answer and rephrases the same pending question", async () => {
  const { enqueueQuestion } = await import("@/lib/open-question-queue");
  const question =
    "How would you allocate distinct counter values in Cassandra?";
  const queue = enqueueQuestion([], question, 0, "id_allocation");
  const detour = [
    { role: "assistant" as const, content: question },
    {
      role: "user" as const,
      content: "Redis uses a five-minute TTL to reduce database reads.",
    },
  ];
  const state = {
    ...context,
    openQuestions: queue,
    answeredQuestionIds: [] as string[],
  };
  const reworded =
    "What prevents two API instances from allocating the same counter value?";
  create.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify({
      topicId: "concurrent-create",
      continuesQuestionId: queue[0].id,
      question: reworded,
      acknowledgement: "That TTL bounds cached data age.",
      acknowledgementQuote: detour[1].content,
      answers: [],
      covered: [],
    }),
  });
  const reply = await discussionReply(detour, state, board);
  expect(reply).toContain("That TTL bounds cached data age.");
  expect(reply).toContain(reworded);
  expect(reply).not.toContain(question);
  expect(state.answeredQuestionIds).toEqual([]);
  expect(state).toHaveProperty("continuedQuestionId", queue[0].id);
});
