import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "@/lib/chat";
import { getProblem } from "@/lib/problems";
import { prepareInterviewTurn } from "@/lib/interview-turn";
import {
  acquireInterviewSession,
  createInterviewSession,
} from "@/lib/interview-sessions";
import { validateScorecard } from "@/lib/scorecard-validation";
import {
  endedAtFixture,
  gradingAssessmentFixture,
  gradingSnapshot,
} from "@/lib/fixtures/scorecard-test";

const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", async (original) => ({
  ...(await original<typeof import("openai")>()),
  default: class {
    responses = { create: mocks.create };
  },
}));
const selected = getProblem("single-server-scaling");
if (!selected) throw new Error("Missing problem");
const problem = selected;
const selection = { problemId: problem.id, level: "mid" as const };
const technical = [
  "A larger server reduces CPU pressure.",
  "Requests and data stay on that machine, but it costs more.",
];
function discussionSession() {
  const id = createInterviewSession(selection, 1);
  for (const phaseIndex of [1, 2]) {
    const lease = acquireInterviewSession(id, selection);
    lease.commit({ phaseIndex, coveredCriteria: [0] });
    lease.release();
  }
  return id;
}
function readState(id: string) {
  const lease = acquireInterviewSession(id, selection);
  lease.release();
  return lease.state;
}
async function completeTurn(id: string, messages: ChatMessage[]) {
  const turn = await prepareInterviewTurn(
    problem,
    { ...selection, sessionId: id, messages },
    new AbortController().signal,
  );
  try {
    turn.commit("Thanks for discussing the tradeoff.");
  } finally {
    turn.release();
  }
}
beforeEach(() => {
  mocks.create.mockReset();
  vi.stubEnv("OPENAI_KEY", "test-key");
});
afterEach(() => vi.unstubAllEnvs());

describe("candidate evidence in stage progress and published scorecards", () => {
  it("preserves existing coverage without advancing on controls alone", async () => {
    const id = discussionSession();
    await completeTurn(id, [
      { role: "user", content: "Hello" },
      {
        role: "user",
        content: "I've finished explaining. Let's discuss my design.",
        source: "control",
        action: "review",
      },
    ]);
    expect(readState(id)).toEqual({ phaseIndex: 2, coveredCriteria: [0] });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each([true, false])(
    "only advances for a technical quote in a mixed review message (control quote: %s)",
    async (citeControl) => {
      const id = discussionSession();
      mocks.create
        .mockResolvedValueOnce({
          status: "completed",
          output_text: JSON.stringify({
            criteria: technical.map((quote, criterionIndex) => ({
              criterionIndex,
              met: true,
              messageIndex: 0,
              quote: citeControl ? "I've finished explaining." : quote,
            })),
          }),
        })
        .mockResolvedValueOnce({
          status: "completed",
          output_text: JSON.stringify({
            criteria: [0, 1].map((criterionIndex) => ({
              criterionIndex,
              met: false,
              messageIndex: -1,
              quote: "",
            })),
          }),
        });
      await completeTurn(id, [
        {
          role: "user",
          content: `I've finished explaining. ${technical.join(" ")}`,
          action: "review",
        },
      ]);
      expect(readState(id)).toEqual(
        citeControl
          ? { phaseIndex: 2, coveredCriteria: [0] }
          : { phaseIndex: 3, coveredCriteria: [] },
      );
    },
  );
  it.each<ChatMessage>([
    { role: "user", content: "Hello" },
    { role: "user", content: "I've finished explaining. Let's discuss." },
    { role: "user", content: technical.join(" "), source: "control" },
  ])(
    "rejects score evidence attributed to an excluded message: %j",
    (message) => {
      const assessment = gradingAssessmentFixture();
      assessment.areas[0].evidence = [{ kind: "message", quoteId: "m2q0" }];
      expect(() =>
        validateScorecard(
          problem,
          "mid",
          {
            ...gradingSnapshot,
            messages: [...gradingSnapshot.messages, message],
          },
          endedAtFixture,
          assessment,
        ),
      ).toThrow("unknown candidate quote");
    },
  );
  it("publishes the real explanation with its original index from a mixed message", () => {
    const quote = "I would compare throughput before and after.";
    const assessment = gradingAssessmentFixture();
    assessment.areas[4].evidence = [{ kind: "message", quoteId: "m2q0" }];
    const scorecard = validateScorecard(
      problem,
      "mid",
      {
        ...gradingSnapshot,
        messages: [
          ...gradingSnapshot.messages,
          {
            role: "user",
            content: `Please let me finish. ${quote} I've finished explaining.`,
            action: "explain",
          },
        ],
      },
      endedAtFixture,
      assessment,
    );
    expect(scorecard.areas[4].evidence).toEqual([
      { kind: "message", messageIndex: 2, quote },
    ]);
  });
});
