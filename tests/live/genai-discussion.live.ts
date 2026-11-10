import { expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { getProblem } from "@/lib/problems";
import { streamInterviewerReply } from "@/lib/llm";
import { enqueueQuestion } from "@/lib/open-question-queue";
import type { ChatMessage } from "@/lib/chat";
import type { InterviewContext } from "@/lib/interview-instructions";
import { calls, metered } from "./model-meter";
vi.mock("@/lib/observed-model-request", async () => import("./observed-live"));
it("uses old answers and never makes a third attempt at the same pending issue", async () => {
  const problem = getProblem("enterprise-rag-assistant");
  if (!problem) throw new Error("Missing RAG");
  const question =
    "How does the answer cache prevent one employee receiving another employee's cached answer?";
  const topic = "cache|caching";
  const evidence =
    "The answer cache key includes employee ID, current ACL version and source document versions; reuse requires all of these to match, and uncertainty fails closed.";
  const messages: ChatMessage[] = [
    { role: "assistant", content: "Explain the design." },
    { role: "user", content: evidence },
    ...Array.from({ length: 12 }, () => ({
      role: "user" as const,
      source: "control" as const,
      content: "Continuing the explanation.",
      action: "explain" as const,
    })),
    { role: "assistant", content: question },
    {
      role: "user",
      content:
        "I covered cache scoping earlier. Let's examine another failure boundary.",
    },
  ];
  const queue = enqueueQuestion([], question, 14, topic);
  const context: InterviewContext = {
    problem,
    level: "senior",
    phase: problem.phases[3],
    progress: { step: "review", candidateTurns: 2, discussionTurnLimit: 99 },
    designText: "API scoped answer cache vector index permissions",
    diagramLabels: [
      "API",
      "Scoped answer cache",
      "Vector index",
      "Permissions",
    ],
    openQuestions: queue,
    answeredQuestionIds: [],
    questionMemory: {
      askedQuestions: [question],
      coveredTopics: [],
      topicTurns: { [topic]: 1 },
    },
  };
  let reply = "";
  await metered("discussion-old-answer", async () => {
    for await (const part of streamInterviewerReply(
      messages,
      "Nodes: API, Scoped answer cache, Vector index, Permissions. Edges: API -> Scoped answer cache; API -> Vector index.",
      "No changes.",
      undefined,
      undefined,
      context,
    ))
      reply += part;
  });
  mkdirSync("artifacts/genai-retest", { recursive: true });
  writeFileSync(
    "artifacts/genai-retest/discussion-first-reply.json",
    JSON.stringify(
      {
        question,
        evidence,
        reply,
        topic: context.selectedTopic,
        answered: context.answeredQuestionIds,
      },
      null,
      2,
    ),
  );
  expect(context.answeredQuestionIds).toContain(queue[0].id);
  expect(reply).not.toContain(question);
  expect(reply).toMatch(/revok|revocation|stale|delay|invalidat|lag/iu);
  const weak: ChatMessage[] = [
    { role: "assistant", content: question },
    { role: "user", content: "I use a cache." },
    {
      role: "assistant",
      content:
        "Which fields in the cache key distinguish employees with different access?",
    },
    { role: "user", content: "I would use the standard cache settings." },
  ];
  const capped: InterviewContext = {
    ...context,
    openQuestions: enqueueQuestion([], question, 0, topic),
    answeredQuestionIds: [],
    retiredQuestionIds: [],
    questionMemory: {
      askedQuestions: [question, weak[2].content],
      coveredTopics: [],
      topicTurns: { [topic]: 2 },
    },
  };
  let next = "";
  await metered("discussion-two-attempts", async () => {
    for await (const part of streamInterviewerReply(
      weak,
      "API -> Scoped answer cache; API -> Vector index.",
      "No changes.",
      undefined,
      undefined,
      capped,
    ))
      next += part;
  });
  mkdirSync("artifacts/genai-retest", { recursive: true });
  writeFileSync(
    "artifacts/genai-retest/discussion.json",
    JSON.stringify(
      {
        question,
        evidence,
        reply,
        next,
        retired: capped.retiredQuestionIds,
        calls,
      },
      null,
      2,
    ),
  );
  expect(capped.retiredQuestionIds).toContain(
    capped.openQuestions?.[0]?.id ?? queue[0].id,
  );
  expect(capped.selectedTopic).not.toBe(topic);
  expect(next).not.toContain(question);
});
