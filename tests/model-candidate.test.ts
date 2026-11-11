import { afterEach, expect, it, vi } from "vitest";
import { modelCandidate } from "./live/model-candidate";
const mock = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: mock.request,
}));
afterEach(() => vi.resetAllMocks());
const input = {
  brief: "Design an assistant.",
  messages: [
    {
      role: "assistant" as const,
      content: "How does a retry avoid duplicate actions?",
    },
  ],
  diagram: { nodes: [], edges: [] },
  quality: "strong" as const,
  task: "Answer the actual question",
  label: "test",
};
it("supplies the actual question and only public candidate context", async () => {
  mock.request.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify({
      message: "I persist an idempotency key with the action result.",
      nodes: [],
      edges: [],
    }),
  });
  await modelCandidate(input);
  const payload = JSON.parse(mock.request.mock.calls[0][1].input);
  expect(payload.conversation).toEqual(input.messages);
  expect(Object.keys(payload).sort()).toEqual([
    "conversation",
    "own_diagram",
    "public_brief",
    "task",
  ]);
  expect(JSON.stringify(payload)).not.toMatch(
    /rubric|anchor|red.flag|expected.design/iu,
  );
});
it("rejects an invented edge instead of grading a mismatched board", async () => {
  mock.request.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify({
      message: "My diagram",
      nodes: ["API"],
      edges: [{ from: 0, to: 2 }],
    }),
  });
  await expect(modelCandidate(input)).rejects.toThrow("invalid edge");
});
