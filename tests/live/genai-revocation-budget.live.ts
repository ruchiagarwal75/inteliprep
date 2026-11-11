import { expect, it, vi } from "vitest";
import { withinInterviewQuestionBudget } from "@/lib/interview-question-budget";
vi.mock("@/lib/observed-model-request", async () => import("./observed-live"));
it("rejects the actual third revocation question found in the adaptive run", async () => {
  expect(
    await withinInterviewQuestionBudget(
      "If an employee’s access is revoked while their question waits in the queue, how does your design prevent the eventual answer from exposing that content?",
      [
        {
          role: "assistant",
          content:
            "If permission and retention synchronization falls behind, how does your design prevent retrieval from exposing a passage after the five-minute revocation window?",
        },
        {
          role: "user",
          content:
            "I’d use fail-closed authorization with bounded permission freshness, rather than treating synchronized index permissions as sufficient.",
        },
        {
          role: "assistant",
          content:
            "How does the authorization service determine that permission data is fresh enough to allow a passage through?",
        },
        {
          role: "user",
          content:
            "I’d base that decision on source-backed permission freshness attestations and synchronization health, rather than index timestamps alone.",
        },
      ],
    ),
  ).toBe(false);
});
