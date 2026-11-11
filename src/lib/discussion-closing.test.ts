import { afterEach, expect, it, vi } from "vitest";
import { closeDiscussion } from "@/lib/discussion-closing";
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
const response = (instruction: string, quoteId = "m0q0") => ({
  status: "completed",
  output_text: JSON.stringify({ instruction, quoteId }),
});
it("requests a clear grounded closing rather than another technical question", async () => {
  model.mockResolvedValue(
    response(
      "End the interview when ready, keeping your retry-budget tradeoff in mind.",
    ),
  );
  expect(await closeDiscussion(messages)).toContain("retry-budget");
  expect(model.mock.calls[0][1].text.format.name).toBe("discussion_closing");
});
it("rejects invented grounding and repeated sentences", async () => {
  model.mockResolvedValueOnce(
    response("End the interview when ready.", "invented"),
  );
  model.mockResolvedValueOnce(
    response("Conclude the interview when ready, considering the task budget."),
  );
  expect(await closeDiscussion(messages)).toContain("task budget");
  model
    .mockReset()
    .mockResolvedValue(response("End the interview when ready."));
  expect(
    await closeDiscussion([
      ...messages,
      { role: "assistant", content: "End the interview when ready." },
    ]),
  ).toBeUndefined();
});
