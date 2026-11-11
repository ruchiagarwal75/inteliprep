import { beforeEach, expect, it, vi } from "vitest";
import examples from "../../tests/fixtures/genai-retest-2-facts.json";
import {
  classifyGenaiFacts,
  genaiClarification,
} from "@/lib/genai-fact-router";
import { getProblem } from "@/lib/problems";
const model = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: model,
}));
beforeEach(() => {
  model.mockReset();
});
it.each(examples)("formats $problemId: $message", async (row) => {
  const problem = getProblem(row.problemId);
  if (!problem) throw new Error("Missing problem");
  model.mockResolvedValueOnce({
    status: "completed",
    output_text: JSON.stringify({
      intent: row.intent,
      factIds: row.ids,
      hasUnspecified: false,
    }),
  });
  const answer = await genaiClarification(problem, "senior", [
    { role: "user", content: row.message },
  ]);
  if (row.intent === "facts")
    for (const id of row.ids)
      expect(answer?.text).toContain(
        problem.genai?.facts.find((f) => f.id === id)?.answers.senior,
      );
  else if (row.intent === "choice")
    expect(answer?.text).toMatch(/choose|choice/iu);
  else if (row.intent === "estimate")
    expect(answer?.text).toMatch(/estimate/iu);
  else if (row.intent === "general") {
    expect(answer?.text).not.toMatch(/specified/iu);
    expect(answer?.text).toContain("What would you like to know?");
  } else expect(answer).toBeUndefined();
});
it("keeps problem-specific distinctions in descriptions, not classifier instructions", async () => {
  const problem = getProblem("ai-chat-assistant");
  if (!problem) throw new Error("Missing problem");
  model.mockResolvedValueOnce({
    status: "completed",
    output_text: JSON.stringify({
      intent: "facts",
      factIds: ["gpu-warmup"],
      hasUnspecified: false,
    }),
  });
  await classifyGenaiFacts(problem, "How fast can we scale out GPUs?");
  expect(model.mock.lastCall?.[1].instructions).not.toMatch(
    /GPU|warmup|freshness|residency|embedding/iu,
  );
  expect(model.mock.lastCall?.[1].input).toMatch(/readiness delay/iu);
});
