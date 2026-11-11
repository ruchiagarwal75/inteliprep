import { expect, it, vi } from "vitest";
import {
  estimationAsk,
  clarificationContinuation,
} from "@/lib/clarification-continuation";
import { genaiEstimateVerdict } from "@/lib/genai-estimation";
import { streamInterviewerReply } from "@/lib/llm";
import { genaiEngineFixture } from "@/lib/fixtures/genai-engine-test";
import type { InterviewContext } from "@/lib/interview-instructions";
import { isGenaiEstimate } from "@/lib/genai-estimate-detection";
const model = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: model,
}));
const content =
  "I assume about 1,667 GPUs for 4.17M output tokens per second at 2,500 per GPU. Does that sound right?";
const messages = [{ role: "user" as const, content }];
it("checks a stated estimate ending in a question, without confusing a capacity request", () => {
  expect(
    isGenaiEstimate("I estimate about 1,667 GPUs. Does that sound right?"),
  ).toBe(true);
  expect(isGenaiEstimate("How many GPUs do I need for 20M users?")).toBe(false);
});
it("does not turn a volunteered GenAI estimate into another request for inputs", () => {
  expect(
    estimationAsk(
      [
        {
          role: "user",
          content: content.replace(" Does that sound right?", ""),
        },
      ],
      "senior",
      "genai",
    ),
  ).toBeUndefined();
  expect(
    clarificationContinuation(messages, "senior", "genai", true),
  ).not.toMatch(/inputs|assumptions|arithmetic|estimate again/iu);
});
it("only treats a verified, quoted reasonable verdict as accepted", async () => {
  const context = { problem: genaiEngineFixture(), level: "senior" as const };
  model.mockResolvedValueOnce({
    status: "completed",
    output_text: JSON.stringify({
      verdict: "reasonable",
      evidenceQuote: content,
    }),
  });
  expect(await genaiEstimateVerdict(messages, context)).toBe("reasonable");
  model.mockResolvedValueOnce({
    status: "completed",
    output_text: JSON.stringify({
      verdict: "reasonable",
      evidenceQuote: "invented",
    }),
  });
  expect(await genaiEstimateVerdict(messages, context)).toBeUndefined();
});
it("carries acceptance into the reply prompt without re-asking the arithmetic", async () => {
  const problem = genaiEngineFixture();
  const context: InterviewContext = {
    problem,
    level: "senior",
    phase: problem.phases[0],
    coveredCriteria: [0, 1, 2],
    mayInviteDrawing: false,
    progress: {
      step: "discussion",
      candidateTurns: 1,
      discussionTurnLimit: 99,
    },
  };
  model.mockImplementation(
    async (
      operation: string,
      request: { text?: { format?: { name?: string } } },
    ) =>
      request.text?.format?.name === "genai_fact_selection"
        ? {
            status: "completed",
            output_text: JSON.stringify({
              intent: "other",
              factIds: [],
              hasUnspecified: false,
            }),
          }
        : operation === "assessment"
          ? {
              status: "completed",
              output_text: JSON.stringify({
                verdict: "reasonable",
                evidenceQuote: content,
              }),
            }
          : (async function* () {
              yield {
                type: "response.output_text.delta",
                delta: "That estimate is consistent with those assumptions.",
              };
              yield { type: "response.completed" };
            })(),
  );
  let reply = "";
  for await (const part of streamInterviewerReply(
    messages,
    "Empty board.",
    "",
    undefined,
    undefined,
    context,
  ))
    reply += part;
  expect(context.estimateAccepted).toBe(true);
  expect(reply).not.toMatch(/isn't specified|What would you assume/iu);
  expect(reply).not.toMatch(
    /What inputs|Could you work through|walk through that estimate|redo/iu,
  );
  expect(
    JSON.stringify(model.mock.calls.find((c) => c[0] === "reply")?.[1].input),
  ).toContain("verified against the candidate");
});
