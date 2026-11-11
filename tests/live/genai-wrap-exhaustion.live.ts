import { expect, it, vi } from "vitest";
import { mkdirSync, appendFileSync } from "node:fs";
import { closeDiscussion } from "@/lib/discussion-closing";
vi.mock("@/lib/observed-model-request", async (original) => {
  const actual =
    await original<typeof import("@/lib/observed-model-request")>();
  return {
    ...actual,
    observedModelRequest: async (
      ...args: Parameters<typeof actual.observedModelRequest>
    ) => {
      const response = await actual.observedModelRequest(...args);
      mkdirSync("artifacts/genai-retest-3", { recursive: true });
      appendFileSync(
        "artifacts/genai-retest-3/wrap-exhaustion-diagnostic.jsonl",
        JSON.stringify({
          format: args[1].text?.format,
          output: response.output_text,
        }) + "\n",
      );
      return response;
    },
  };
});
it("closes an exhausted final stage with a new grounded instruction", async () => {
  const reply = await closeDiscussion([
    {
      role: "user",
      content:
        "I use scoped tokens and a persisted idempotency key, and stop retries when the task budget is exhausted.",
    },
  ]);
  expect(reply).toMatch(/end (?:the |this |your )?interview/iu);
});
