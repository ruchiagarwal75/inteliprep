import { afterEach, expect, it, vi } from "vitest";
import { acknowledgeDesignUpdate } from "@/lib/design-update-acknowledgement";
const mock = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: mock.request,
}));
afterEach(() => vi.resetAllMocks());
const message = {
  role: "user" as const,
  content: "I added an evaluation gate before releases.",
};
function result(
  quote = "I added an evaluation gate",
  acknowledgement = "Got it, you added an evaluation gate.",
) {
  mock.request.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify({ changed: true, quote, acknowledgement }),
  });
}
it("acknowledges the actual revision with exact candidate proof", async () => {
  result();
  expect(await acknowledgeDesignUpdate(message, "Added: evaluation gate")).toBe(
    "Got it, you added an evaluation gate.",
  );
});
it("does not call the model for a re-explain entry control", async () => {
  expect(
    await acknowledgeDesignUpdate(
      { ...message, source: "control", action: "explain" },
      "",
    ),
  ).toBeUndefined();
  expect(mock.request).not.toHaveBeenCalled();
});
it.each([
  ["I added a queue", "You added a queue."],
  ["I added an evaluation gate", "Why add an evaluation gate?"],
  ["I added an evaluation gate", "Got it, " + "another ".repeat(26)],
])(
  "rejects ungrounded or interrupting acknowledgements",
  async (quote, text) => {
    result(quote, text);
    expect(await acknowledgeDesignUpdate(message, "")).toBeUndefined();
  },
);
it("remains quiet for a message without a change", async () => {
  mock.request.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify({
      changed: false,
      quote: "",
      acknowledgement: "",
    }),
  });
  expect(await acknowledgeDesignUpdate(message, "")).toBeUndefined();
});
