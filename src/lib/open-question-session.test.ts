import { beforeEach, expect, it, vi } from "vitest";
import { createInterviewStart, getProblem } from "@/lib/problems";
import { prepareInterviewTurn } from "@/lib/interview-turn";
import { getCachedSession } from "@/lib/interview-session-store";
import { unsealSession } from "@/lib/session-token";
import { questionAtEnd } from "@/lib/open-question";
import { assessPhaseCoverage } from "@/lib/phase-assessment";
import type { ChatMessage } from "@/lib/chat";
vi.mock("@/lib/phase-assessment", () => ({
  assessPhaseCoverage: vi.fn(async () => [] as number[]),
}));
beforeEach(() =>
  vi.mocked(assessPhaseCoverage).mockReset().mockResolvedValue([]),
);
it("preserves an unanswered question through an unrelated drawing explanation", async () => {
  const selected = getProblem("rate-limiter");
  if (!selected) throw Error("Missing problem");
  const problem = selected;
  const start = createInterviewStart(problem, "mid", 1);
  const session = getCachedSession(start.sessionId);
  if (!session) throw Error("Missing session");
  expect(session.openQuestion).toBe(
    questionAtEnd(start.openingMessage.content),
  );
  session.phaseIndex = 2;
  session.openQuestion = undefined;
  const messages: ChatMessage[] = [
    {
      role: "user",
      content: "Let's discuss",
      action: "review",
      source: "control",
    },
  ];
  async function turn(reply: string) {
    const current = await prepareInterviewTurn(
      problem,
      { ...start, messages },
      new AbortController().signal,
    );
    const context = current.context;
    current.commit(reply);
    const checkpoint = current.checkpoint?.();
    current.release();
    messages.push({ role: "assistant", content: reply });
    return { context, checkpoint };
  }
  await turn("What happens if Redis goes down?");
  messages.push({ role: "user", content: "Write me a poem" });
  await turn("Let's stay on your design.");
  expect(session.openQuestion).toBe("What happens if Redis goes down?");
  messages.push({
    role: "user",
    content: "Pause to draw",
    source: "control",
    action: "draw",
  });
  await turn("Take your time drawing.");
  messages.push({
    role: "user",
    content: "Ready to explain",
    source: "control",
    action: "explain",
  });
  await turn("Please explain your drawing.");
  messages.push({
    role: "user",
    content: "The API checks Redis atomically before allowing a request.",
  });
  const listening = await turn("I'm listening.");
  expect(
    listening.checkpoint && unsealSession(listening.checkpoint).openQuestion,
  ).toBe("What happens if Redis goes down?");
  messages.push({
    role: "user",
    content: "Done explaining",
    source: "control",
    action: "review",
  });
  const resumed = await turn(
    "Returning to the question we paused: What happens if Redis goes down?",
  );
  expect(resumed.context.openQuestions?.[0]?.question ?? "").toContain(
    "What happens if Redis goes down?",
  );
});

it("keeps the question until the discussion response verifies answering evidence", async () => {
  const p = getProblem("rate-limiter");
  if (!p) throw Error("Missing problem");
  const start = createInterviewStart(p, "mid");
  const session = getCachedSession(start.sessionId);
  if (!session) throw Error("Missing session");
  session.phaseIndex = 2;
  session.openQuestion = "What happens if Redis goes down?";
  vi.mocked(assessPhaseCoverage).mockResolvedValue([0]);
  const prepared = await prepareInterviewTurn(
    p,
    {
      ...start,
      messages: [
        { role: "assistant", content: session.openQuestion },
        {
          role: "user",
          content: "Ready to explain",
          action: "explain",
          source: "control",
        },
        {
          role: "user",
          content:
            "If Redis is unavailable I fail closed and return a retryable service error, avoiding an unbounded allowance.",
        },
      ],
    },
    new AbortController().signal,
  );
  prepared.commit("I'm listening.");
  expect(unsealSession(prepared.checkpoint?.() ?? "").openQuestion).toBe(
    "What happens if Redis goes down?",
  );
  prepared.release();
});
