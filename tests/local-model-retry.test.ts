import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/route";
import { getProblem, createInterviewStart } from "@/lib/problems";
import { acquireInterviewSession } from "@/lib/interview-sessions";
import { getCachedSession } from "@/lib/interview-session-store";
import { postChatTurn } from "@/lib/post-chat-turn";
import {
  withDevelopmentModelFault,
  injectDevelopmentModelFailure,
} from "@/lib/development-model-fault";
import basicScene from "@/lib/fixtures/basic-system.json";
import { sceneSchema } from "@/lib/scene";

const create = vi.hoisted(() => vi.fn());
vi.mock("@/lib/openai-client", () => ({
  createOpenAIClient: () => ({ responses: { create } }),
  interviewerModel: () => "test-model",
  hasApiKey: () => true,
}));
vi.mock("@/lib/phase-assessment", () => ({
  assessPhaseCoverage: async () => [],
}));
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("INTELIPREP_ENV", "");
  vi.stubEnv("INTELIPREP_TEST_MODEL_503_ONCE", "1");
  create
    .mockReset()
    .mockImplementation(
      async (input: {
        stream?: boolean;
        text?: { format?: { name?: string } };
      }) =>
        input.text?.format?.name === "interview_question_budget"
          ? {
              status: "completed",
              output_text: JSON.stringify({
                sameIssueIndexes: [],
                answeredQuoteId: "",
              }),
            }
          : input.stream
            ? (async function* () {
                yield {
                  type: "response.output_text.delta",
                  delta: "How does the request reach the data store?",
                };
                yield { type: "response.completed" };
              })()
            : {
                status: "completed",
                output_text: JSON.stringify({
                  alreadyAnswered: false,
                  answerMessageIndex: -1,
                  answerQuote: "",
                  followsLatestReply: true,
                  withinStage: true,
                  replacementQuestion: "",
                  acknowledgement: "",
                  acknowledgementQuote: "",
                }),
              },
    );
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
it("recovers automatically from the local 503 flag through the actual chat route", async () => {
  const problem = getProblem("single-server-scaling");
  if (!problem) throw new Error("Missing fixture problem");
  const started = createInterviewStart(problem, "mid");
  const lease = acquireInterviewSession(started.sessionId, started);
  lease.commit({ phaseIndex: 1, coveredCriteria: [] });
  lease.release();
  const explanation = {
    role: "user" as const,
    content:
      "I would measure CPU and latency under load, then compare results.",
    action: "explain" as const,
  };
  const session = getCachedSession(started.sessionId);
  if (!session) throw new Error("Missing fixture session");
  // This fixture jumps past clarification to isolate a provider-backed discussion turn.
  session.openQuestion = undefined;
  session.transcript = { messages: [started.openingMessage, explanation] };
  const messages = [
    ...session.transcript.messages,
    {
      role: "user" as const,
      content: "I've finished explaining. Let's discuss.",
      action: "review" as const,
      source: "control" as const,
    },
  ];
  const reply = await postChatTurn(
    async (_url, init) => POST(new Request("http://localhost/api/chat", init)),
    { ...started, messages, scene: sceneSchema.parse(basicScene) },
    vi.fn(),
    vi.fn(),
  );
  expect(reply.reply).toContain("How does the request reach the data store?");
  const events = vi.mocked(console.info).mock.calls.flatMap((call) => {
    try {
      const value: unknown = JSON.parse(String(call[0]));
      return value &&
        typeof value === "object" &&
        "event" in value &&
        typeof value.event === "string"
        ? [value.event]
        : [];
    } catch {
      return [];
    }
  });
  expect(events.filter((event) => event === "model_test_fault")).toHaveLength(
    1,
  );
  expect(events.filter((event) => event === "model_retry")).toHaveLength(1);
  expect(create.mock.calls.filter((call) => call[0].stream)).toHaveLength(1);
  expect(session.transcript?.messages).toEqual([
    ...messages,
    { role: "assistant", content: reply.reply },
  ]);
});
it.each(["production", "beta", "vercel"])(
  "never injects test failures in %s",
  (mode) => {
    if (mode === "production") vi.stubEnv("NODE_ENV", "production");
    if (mode === "beta") vi.stubEnv("INTELIPREP_ENV", "beta");
    if (mode === "vercel") vi.stubEnv("VERCEL", "1");
    expect(() =>
      withDevelopmentModelFault(() => injectDevelopmentModelFailure()),
    ).not.toThrow();
  },
);
