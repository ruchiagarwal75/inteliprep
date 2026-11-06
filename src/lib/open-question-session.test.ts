import { expect, it, vi } from "vitest";
import { createInterviewStart, getProblem } from "@/lib/problems";
import { prepareInterviewTurn } from "@/lib/interview-turn";
import { getCachedSession } from "@/lib/interview-session-store";
import { unsealSession } from "@/lib/session-token";
import { questionAtEnd } from "@/lib/open-question";
import type { ChatMessage } from "@/lib/chat";
vi.mock("@/lib/phase-assessment", () => ({
  assessPhaseCoverage: async () => [],
}));
it("keeps the open question through drawing and explanation and restores it from an opaque checkpoint", async () => {
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
  expect(resumed.context.reviewQuestion).toContain(
    "What happens if Redis goes down?",
  );
});
