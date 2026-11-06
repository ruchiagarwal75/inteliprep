import { beforeEach, expect, it, vi } from "vitest";
import { getProblem } from "@/lib/problems";
import { gradeInterview } from "@/lib/interview-grading";
import { candidateQuotes } from "@/lib/scorecard-quotes";
const create = vi.hoisted(() => vi.fn());
vi.mock("@/lib/openai-client", () => ({
  createOpenAIClient: () => ({ responses: { create } }),
  interviewerModel: () => "test-model",
}));
beforeEach(() => {
  create.mockReset();
});
it.each([
  [
    "notification-system",
    0,
    "What peak rate and dispatch time should I use, and what does idempotency guarantee?",
  ],
  [
    "file-storage",
    2,
    "I use a compare-and-set version check: if a second device submits a stale base version it gets a conflict instead of silently overwriting the newer file.",
  ],
] as const)(
  "keeps %s clarification/design evidence and supplies full scope to grading",
  async (id, index, content) => {
    const problem = getProblem(id);
    if (!problem) throw new Error("Missing problem");
    const snapshot = {
      messages: [
        {
          role: "assistant" as const,
          content: problem.levels.mid.openingMessage,
        },
        { role: "user" as const, content },
      ],
    };
    const quoteId = candidateQuotes(snapshot.messages)[0].quoteId;
    create.mockResolvedValue({
      status: "completed",
      output_text: JSON.stringify({
        summary: "Only the explored topic is assessed.",
        signal: "insufficient_evidence",
        areas: problem.rubric.map((_, areaIndex) => ({
          areaIndex,
          score: areaIndex === index ? 2 : null,
          rationale: "Relevant candidate evidence, with limited depth.",
          evidence: areaIndex === index ? [{ kind: "message", quoteId }] : [],
        })),
        strengths: [],
        gaps: [],
        nextProblemId: id,
        practiceFocus: "Explain a concrete design choice and its tradeoff.",
      }),
    });
    const card = await gradeInterview(
      problem,
      "mid",
      snapshot,
      new Date().toISOString(),
    );
    expect(card.areas[index].score).toBe(2);
    expect(card.areas[index].evidence).toMatchObject([
      { kind: "message", messageIndex: 1, quote: content },
    ]);
    const input = JSON.parse(create.mock.calls[0][0].input[0].content);
    expect(input.problem.requirements).toEqual(problem.requirements);
    expect(input.problem.grading_guidance).toEqual(problem.gradingGuidance);
    expect(input.private_rubric[index].topic_explored).toBe(true);
  },
);
