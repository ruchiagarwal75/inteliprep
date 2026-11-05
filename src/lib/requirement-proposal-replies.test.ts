import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ChatMessage } from "@/lib/chat";
import { streamInterviewerReply } from "@/lib/llm";
import {
  getInterviewProgress,
  isListeningContinuation,
} from "@/lib/interview-progress";
import { getProblem } from "@/lib/problems";
import { prepareInterviewTurn } from "@/lib/interview-turn";
import { acquireInterviewSession } from "@/lib/interview-sessions";
import { reviewScene, problemReviews } from "@/lib/fixtures/problem-reviews";
import { createInterviewStart } from "@/lib/problems";
import { POST as chat } from "@/app/api/chat/route";
import { postChatTurn } from "@/lib/post-chat-turn";
import { diagramReviewQuestion } from "@/lib/diagram-review";

const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({
  APIError: class extends Error {},
  default: class {
    responses = { create: mocks.create };
  },
}));
vi.mock("@/lib/phase-assessment", () => ({
  assessPhaseCoverage: async () => [],
}));
const problem = getProblem("news-feed");
if (!problem) throw new Error("Missing news feed");
const candidate = "I suggest keeping posts 1 year instead of 90 days.";
beforeEach(() => {
  vi.stubEnv("OPENAI_KEY", "test-key");
  mocks.create.mockReset().mockImplementation(async function* () {
    yield {
      type: "response.output_text.delta",
      delta:
        "Accepted: keep posts for one year. Choose Done explaining when you're ready for questions.",
    };
    yield { type: "response.completed" };
  });
});
afterEach(() => vi.unstubAllEnvs());

it.each(["draw", "explain"] as const)(
  "acknowledges the retention change during %s without restarting questions",
  async (action) => {
    const messages: ChatMessage[] = [
      {
        role: "user",
        action,
        content:
          action === "draw"
            ? "Give me time to draw."
            : "Please let me finish explaining.",
      },
      { role: "user", content: candidate },
    ];
    const progress = getInterviewProgress(problem, messages);
    expect(isListeningContinuation(problem, messages, progress.step)).toBe(
      false,
    );
    let reply = "";
    for await (const chunk of streamInterviewerReply(
      messages,
      "drawing",
      "No changes.",
      undefined,
      undefined,
      {
        problem,
        level: "mid",
        phase: problem.phases[1],
        progress,
      },
    ))
      reply += chunk;
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(reply).toContain("Accepted: keep posts for one year.");
    expect(reply).not.toContain("?");
    expect(mocks.create.mock.calls[0][0].instructions).toContain(
      "Respond to that proposal explicitly",
    );
  },
);

it("does not replace a requirement proposal with a diagram probe during discussion", async () => {
  const started = createInterviewStart(problem, "mid");
  const lease = acquireInterviewSession(started.sessionId, started);
  lease.commit({ phaseIndex: 1, coveredCriteria: [] });
  lease.commit({ phaseIndex: 2, coveredCriteria: [] });
  lease.release();
  const example = problemReviews.find((item) => item.problemId === "news-feed");
  if (!example) throw new Error("Missing feed diagram");
  const scene = reviewScene(example);
  scene.elements = scene.elements.filter(
    (element) => element.type !== "text" || !/cache/iu.test(element.text),
  );
  const messages: ChatMessage[] = [
    started.openingMessage,
    { role: "user", content: "I use a feed cache for the read path." },
    {
      role: "user",
      content: "I've finished explaining. Let's discuss my design.",
      action: "review",
      source: "control",
    },
    { role: "user", content: candidate },
  ];
  expect(diagramReviewQuestion(scene, messages, false)).toContain("cache");
  const turn = await prepareInterviewTurn(
    problem,
    {
      problemId: problem.id,
      level: "mid",
      sessionId: started.sessionId,
      messages,
      scene,
    },
    new AbortController().signal,
  );
  try {
    expect(turn.context.reviewQuestion).toBeUndefined();
    expect(turn.context.listening).toBe(false);
  } finally {
    turn.release();
  }
});

it("delivers the proposal response through the browser transport instead of hiding it as listening", async () => {
  const started = createInterviewStart(problem, "mid");
  const lease = acquireInterviewSession(started.sessionId, started);
  lease.commit({ phaseIndex: 1, coveredCriteria: [] });
  lease.release();
  const onStart = vi.fn();
  const onDelta = vi.fn();
  const reply = await postChatTurn(
    async (_input, init) =>
      chat(new Request("http://localhost/api/chat", init)),
    {
      ...started,
      messages: [
        started.openingMessage,
        {
          role: "user",
          content: "Please let me finish explaining.",
          action: "explain",
        },
        { role: "user", content: candidate },
      ],
    },
    onStart,
    onDelta,
  );
  expect(reply.listening).toBe(false);
  expect(onStart).toHaveBeenCalledWith(false);
  expect(onDelta.mock.calls.flat().join("")).toContain(
    "Accepted: keep posts for one year.",
  );
  expect(reply.phase.position).toBe(2);
});
