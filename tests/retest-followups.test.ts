import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/route";
import { createInterviewStart, getProblem } from "@/lib/problems";
import { acquireInterviewSession } from "@/lib/interview-sessions";
import { postChatTurn } from "@/lib/post-chat-turn";
import type { ChatMessage } from "@/lib/chat";
import { getCachedSession } from "@/lib/interview-session-store";
const create = vi.hoisted(() => vi.fn());
vi.mock("@/lib/openai-client", () => ({
  createOpenAIClient: () => ({ responses: { create } }),
  interviewerModel: () => "test-model",
  hasApiKey: () => true,
}));
vi.mock("@/lib/phase-assessment", () => ({
  assessPhaseCoverage: async () => [],
}));
const request: typeof fetch = async (_input, init) =>
  POST(new Request("http://localhost/api/chat", init));
const explanation =
  "The API stores durable state before responding and only publishes a complete result.";
beforeEach(() => {
  create.mockReset();
  let replacement = 0;
  create.mockImplementation(async (input: { stream?: boolean }) => {
    if (input.stream)
      return (async function* () {
        yield {
          type: "response.output_text.delta",
          delta: "How is a complete result published?",
        };
        yield { type: "response.completed" };
      })();
    return {
      status: "completed",
      output_text: JSON.stringify({
        alreadyAnswered: true,
        answerMessageIndex: 1,
        answerQuote: explanation,
        replacementQuestion:
          "What about another already-covered detail " + ++replacement + "?",
        followsLatestReply: true,
        acknowledgement: "",
        acknowledgementQuote: "",
      }),
    };
  });
});
afterEach(() => vi.restoreAllMocks());
it.each([
  ["notification-system", "Let's look at a provider outage.", "provider"],
  ["notification-system", "Can we look at a provider outage?", "provider"],
  [
    "file-storage",
    "Let's examine revoked grants.",
    "revocation|access expires",
  ],
])(
  "keeps %s review exhaustion specific and follows the candidate's chosen topic",
  async (id, choice, topic) => {
    const p = getProblem(id);
    if (!p) throw new Error("Missing problem");
    const start = createInterviewStart(p, "mid", 1);
    const lease = acquireInterviewSession(start.sessionId, start);
    lease.commit({ phaseIndex: 1, coveredCriteria: [] });
    lease.commit({ phaseIndex: 2, coveredCriteria: [0, 1] });
    lease.release();
    const messages: ChatMessage[] = [
      start.openingMessage,
      { role: "user", content: explanation },
      {
        role: "user",
        content: "I've finished explaining. Let's discuss.",
        action: "review",
        source: "control",
      },
    ];
    const session = getCachedSession(start.sessionId);
    if (!session) throw new Error("Missing fixture session");
    session.transcript = { messages: structuredClone(messages.slice(0, -1)) };
    const first = await postChatTurn(
      request,
      { ...start, messages },
      vi.fn(),
      vi.fn(),
    );
    expect(first.phase.position).toBe(4);
    expect(first.reply).not.toContain("What limitation of your current design");
    expect(first.reply).toMatch(/\?/u);
    const calls = create.mock.calls.length;
    messages.push(
      { role: "assistant", content: first.reply },
      { role: "user", content: choice },
    );
    const second = await postChatTurn(
      request,
      { ...start, messages, resumeToken: first.resumeToken },
      vi.fn(),
      vi.fn(),
    );
    expect(second.reply).not.toBe(first.reply);
    expect(second.reply).toMatch(new RegExp(topic, "iu"));
    expect(second.reply).not.toContain(
      "What limitation of your current design",
    );
    expect(create.mock.calls).toHaveLength(calls);
  },
);
it("hands off news feed after the model supplies equivalent traffic, latency and freshness facts", async () => {
  const p = getProblem("news-feed");
  if (!p) throw new Error("Missing problem");
  create.mockImplementation(async function* () {
    yield {
      type: "response.output_text.delta",
      delta:
        "Assume 100k users. Read latency is 0.5 seconds at p95, and new posts appear within 5s.",
    };
    yield { type: "response.completed" };
  });
  const start = createInterviewStart(p, "mid", 1);
  const reply = await postChatTurn(
    request,
    {
      ...start,
      messages: [
        start.openingMessage,
        { role: "user", content: "Please share the operating assumptions." },
      ],
    },
    vi.fn(),
    vi.fn(),
  );
  expect(reply.reply).toContain(p.drawingPolicy.invitation);
  expect(reply.reply).not.toContain("What publishing and reading workload");
  expect(reply.phase.position).toBe(2);
});
