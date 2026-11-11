import { afterEach, expect, it, vi } from "vitest";
import { isNewDesignBoundary } from "@/lib/design-question-novelty";
const model = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: model,
}));
afterEach(() => vi.resetAllMocks());
it.each([
  ["new_boundary", true],
  ["already_answered", false],
  ["same_issue", false],
])("checks a proposed boundary by meaning: %s", async (verdict, expected) => {
  model.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify({ verdict }),
  });
  expect(
    await isNewDesignBoundary(
      "What happens before permission sync catches up?",
      [
        {
          role: "user",
          content:
            "The request checks current membership against the authority before retrieval.",
        },
      ],
    ),
  ).toBe(expected);
});
it("does not accept an incomplete judgment", async () => {
  model.mockResolvedValue({
    status: "incomplete",
    output_text: '{"verdict":"new_boundary"}',
  });
  expect(
    await isNewDesignBoundary("What if the index is unavailable?", []),
  ).toBe(false);
});
