import { afterEach, expect, it, vi } from "vitest";
import { auditFullInterview } from "./live/full-genai-audit";
const mock = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: mock.request,
}));
afterEach(() => vi.resetAllMocks());
const messages = [
  {
    role: "assistant" as const,
    content:
      "Walk me through recovery after the worker loses its acknowledgement.",
  },
  {
    role: "assistant" as const,
    content: "Choose Ready to explain when you finish drawing.",
  },
];
function response(ignoredIndexes: number[], questionIndexes = [0]) {
  mock.request.mockResolvedValue({
    output_text: JSON.stringify({
      issues: [{ issue: "ambiguous retry recovery", questionIndexes }],
      ignoredIndexes,
    }),
  });
}
it("audits technical imperative asks and explicitly accounts for UI instructions", async () => {
  response([1]);
  const result = await auditFullInterview(messages, "audit-test");
  expect(
    JSON.parse(mock.request.mock.calls[0][1].input).questions.map(
      (q: { index: number }) => q.index,
    ),
  ).toEqual([0, 1]);
  expect(result.semanticAudit[0].questionIndexes).toEqual([0]);
  expect(result.ignoredAskIndexes).toEqual([1]);
});
it("rejects an audit that silently omits a supplied ask", async () => {
  response([]);
  await expect(auditFullInterview(messages, "audit-test")).rejects.toThrow(
    "Incomplete semantic audit",
  );
});
it("rejects an invented or duplicated audit index", async () => {
  response([1], [0, 2]);
  await expect(auditFullInterview(messages, "audit-test")).rejects.toThrow(
    "Invalid semantic audit index",
  );
  response([0, 1]);
  await expect(auditFullInterview(messages, "audit-test")).rejects.toThrow(
    "Invalid semantic audit index",
  );
});
