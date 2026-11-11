import { afterEach, expect, it, vi } from "vitest";
import {
  closeDiscussion,
  WRAP_UP_QUESTION,
  isOrderLikeWrapUp,
} from "@/lib/discussion-closing";
import { freshDiscussionQuestion } from "@/lib/fresh-discussion-question";
import { genaiEngineFixture } from "@/lib/fixtures/genai-engine-test";
import { streamInterviewerReply } from "@/lib/llm";
const model = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: model,
}));
afterEach(() => vi.resetAllMocks());
const messages = [
  {
    role: "user" as const,
    content: "I stop retries when the task budget is exhausted.",
  },
];
it("uses the requested final question once without a closing model call", () => {
  expect(closeDiscussion(messages)).toBe(WRAP_UP_QUESTION);
  expect(
    closeDiscussion([
      ...messages,
      { role: "assistant", content: WRAP_UP_QUESTION },
    ]),
  ).toBeUndefined();
  expect(model).not.toHaveBeenCalled();
});
it("turns a stubbed exhausted closing turn into the plain invitation", async () => {
  const problem = genaiEngineFixture();
  model.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify({
      topicId: "",
      quoteId: "",
      question: "",
      exhausted: true,
    }),
  });
  expect(
    await freshDiscussionQuestion(messages, {
      problem,
      level: "senior",
      phase: problem.phases.at(-1),
    }),
  ).toBe(WRAP_UP_QUESTION);
  expect(
    model.mock.calls.every(
      (call) => call[1].text.format.name !== "discussion_closing",
    ),
  ).toBe(true);
});
it("replaces a stubbed order-like reply and stays quiet after final thoughts", async () => {
  const problem = genaiEngineFixture();
  const context = {
    problem,
    level: "senior" as const,
    phase: problem.phases.at(-1),
    reviewQuestion: "Conclude the interview when ready.",
    progress: {
      step: "review" as const,
      candidateTurns: 30,
      discussionTurnLimit: 3,
    },
  };
  let reply = "";
  for await (const part of streamInterviewerReply(
    messages,
    "",
    "",
    undefined,
    undefined,
    context,
  ))
    reply += part;
  expect(reply).toBe(WRAP_UP_QUESTION);
  const next = { ...context, listening: false };
  for await (const part of streamInterviewerReply(
    [
      ...messages,
      { role: "assistant", content: reply },
      { role: "user", content: "I'd tighten the retry budget." },
    ],
    "",
    "",
    undefined,
    undefined,
    next,
  ))
    expect(part).not.toContain(WRAP_UP_QUESTION);
  expect(next.listening).toBe(true);
  expect(model).not.toHaveBeenCalled();
});
it("recognizes legacy commands rather than treating them as final questions", () => {
  expect(isOrderLikeWrapUp("When ready, end the interview.")).toBe(true);
  expect(isOrderLikeWrapUp(WRAP_UP_QUESTION)).toBe(false);
});
