import { expect, it, vi } from "vitest";
import { getProblem } from "@/lib/problems";
import { freshDiscussionQuestion } from "@/lib/fresh-discussion-question";
import type { InterviewContext } from "@/lib/interview-instructions";
vi.mock("@/lib/observed-model-request", async () => import("./observed-live"));
it("finds a new actual-design boundary after every bank issue is closed", async () => {
  const problem = getProblem("enterprise-rag-assistant");
  if (!problem) throw Error("Missing problem");
  const context: InterviewContext = {
    problem,
    level: "senior",
    phase: problem.phases[3],
    designText:
      "permission-filtered retrieval, query cache, bounded per-user retry queue",
    questionMemory: {
      askedQuestions: [],
      coveredTopics: problem.reviewProbes.map((p) => "issue:" + p.id),
      topicTurns: Object.fromEntries(
        problem.reviewProbes.map((p) => [p.id, 2]),
      ),
    },
  };
  const reply = await freshDiscussionQuestion(
    [
      {
        role: "user",
        content:
          "I cache query embeddings before permission-filtered vector retrieval. Requests use bounded per-user retry queues, and workers batch queued requests before contacting the model provider.",
      },
    ],
    context,
  );
  expect(reply).toMatch(/\?$/u);
  expect(context.selectedTopic).toMatch(/^fresh:/u);
  expect(context.advancedPhaseIndex).toBeUndefined();
});
