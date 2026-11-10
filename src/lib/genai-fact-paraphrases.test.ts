import { expect, it, vi } from "vitest";
import examples from "../../tests/fixtures/genai-fact-paraphrases.json";
import { getProblem } from "@/lib/problems";
import { genaiClarification } from "@/lib/genai-fact-router";
import { interviewLevelSchema } from "@/lib/interview-selection";
const model = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: model,
}));
// These are the unchanged retest questions. Live tests verify the semantic selector;
// these route tests verify the authoritative level values and absence of extra facts.
it.each(examples)(
  "$problemId / $level: $message",
  async ({ problemId, message, ids, level }) => {
    const problem = getProblem(problemId);
    if (!problem?.genai) throw new Error("Missing GenAI definition");
    const parsedLevel = interviewLevelSchema.parse(level);
    model.mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify({
        intent: "facts",
        factIds: ids,
        hasUnspecified: false,
      }),
    });
    const answer = await genaiClarification(problem, parsedLevel, [
      { role: "user", content: message },
    ]);
    expect(answer?.text).toBe(
      ids
        .map(
          (id) =>
            problem.genai?.facts.find((f) => f.id === id)?.answers[parsedLevel],
        )
        .join("\n\n"),
    );
  },
);
it("keeps residency, revocation, capacity, warmup and reversibility distinct", () => {
  const rag = getProblem("enterprise-rag-assistant")?.genai?.facts;
  expect(rag?.find((f) => f.id === "data-residency")?.answers.senior).toBe(
    "There are no data residency requirements.",
  );
  expect(
    rag?.find((f) => f.id === "permission-changes")?.answers.senior,
  ).toContain("five minutes");
  const chat = getProblem("ai-chat-assistant")?.genai?.facts;
  expect(chat?.find((f) => f.id === "gpu-warmup")?.answers.senior).toContain(
    "ten minutes",
  );
  expect(chat?.find((f) => f.id === "gpu-capacity")?.answers.staff).toContain(
    "6,000",
  );
  expect(
    getProblem("tool-using-ai-agent")?.genai?.facts.find(
      (f) => f.id === "action-reversibility",
    )?.answers.staff,
  ).toContain("cannot be undone");
});
