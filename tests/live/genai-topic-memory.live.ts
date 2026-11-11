import { expect, it, vi } from "vitest";
import { getProblem } from "@/lib/problems";
import { refreshSemanticTopicMemory } from "@/lib/semantic-topic-memory";
import { globalTopicCounts } from "@/lib/topic-memory";
import { eligibleDiscussionProbes } from "@/lib/genai-probe-memory";
import type { InterviewContext } from "@/lib/interview-instructions";
vi.mock("@/lib/observed-model-request", async () => import("./observed-live"));
for (const sample of [
  {
    id: "injection",
    answer:
      "Passages are inert citations. Only the employee's top-level request can authorize an operation; connector text never acquires that authority, so the embedded salary request is discarded.",
  },
  {
    id: "revoke",
    answer:
      "Each request checks the current membership revision with the access service, and cached answers are bound to that revision. If it cannot be checked, the answer is withheld. A removal is pushed immediately and the synchronous check closes the interval until the periodic refresh.",
  },
])
  it(`remembers a semantically answered RAG ${sample.id} issue across stages`, async () => {
    const problem = getProblem("enterprise-rag-assistant");
    if (!problem) throw Error("Missing problem");
    const probe = problem.reviewProbes.find((p) => p.id === sample.id);
    if (!probe) throw Error("Missing probe");
    const state: InterviewContext = {
      problem,
      level: "senior",
      phase: problem.phases[3],
      questionMemory: {
        askedQuestions: [probe.question],
        coveredTopics: [],
        topicTurns: globalTopicCounts(
          {
            [problem.phases[2].id + ":" + sample.id]: 1,
            [problem.phases[3].id + ":" + sample.id]: 1,
          },
          problem,
        ),
      },
    };
    await refreshSemanticTopicMemory(
      [
        { role: "assistant", content: probe.question },
        { role: "user", content: sample.answer },
      ],
      state,
    );
    expect(state.questionMemory?.coveredTopics).toContain("issue:" + sample.id);
    expect(state.questionMemory?.topicTurns?.[sample.id]).toBe(2);
    expect(
      eligibleDiscussionProbes(
        "genai",
        problem.reviewProbes,
        state.questionMemory,
      ).some((p) => p.id === sample.id),
    ).toBe(false);
  });
