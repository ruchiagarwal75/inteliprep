import { afterEach, expect, it, vi } from "vitest";
import { withinInterviewQuestionBudget } from "@/lib/interview-question-budget";
const model = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: model,
}));
afterEach(() => vi.resetAllMocks());
const messages = [
  {
    role: "assistant" as const,
    content:
      "If synchronization falls behind, how do you prevent exposure after the revocation window?",
  },
  {
    role: "user" as const,
    content: "I would use fresh ACLs and fail-closed authorization.",
  },
  {
    role: "assistant" as const,
    content:
      "How does authorization determine that permission data is fresh enough?",
  },
  {
    role: "user" as const,
    content: "I would use source-backed freshness attestations.",
  },
];
it("rejects a third same-issue ask despite different stage or bank IDs", async () => {
  model.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify({
      sameIssueIndexes: [0, 2],
      answeredQuoteId: "",
    }),
  });
  expect(
    await withinInterviewQuestionBudget(
      "If access is revoked while a question waits in a queue, how is exposure prevented?",
      messages,
    ),
  ).toBe(false);
});
it("permits one narrower follow-up to an unanswered issue", async () => {
  model.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify({ sameIssueIndexes: [0], answeredQuoteId: "" }),
  });
  expect(
    await withinInterviewQuestionBudget(
      "Which freshness signal does authorization check?",
      messages.slice(0, 2),
    ),
  ).toBe(true);
});
it("rejects an already answered question and invented references", async () => {
  model.mockResolvedValueOnce({
    status: "completed",
    output_text: JSON.stringify({
      sameIssueIndexes: [],
      answeredQuoteId: "m1q0",
    }),
  });
  expect(
    await withinInterviewQuestionBudget(
      "How is authorization enforced?",
      messages,
    ),
  ).toBe(false);
  model.mockResolvedValueOnce({
    status: "completed",
    output_text: JSON.stringify({
      sameIssueIndexes: [77],
      answeredQuoteId: "",
    }),
  });
  expect(
    await withinInterviewQuestionBudget(
      "How is authorization enforced?",
      messages,
    ),
  ).toBe(false);
});
