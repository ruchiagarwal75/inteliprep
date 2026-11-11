import { expect, it, vi } from "vitest";
import { getProblem, createInterviewStart } from "@/lib/problems";
import { acquireInterviewSession } from "@/lib/interview-sessions";
import { prepareInterviewTurn } from "@/lib/interview-turn";
import { problemReviews, reviewScene } from "@/lib/fixtures/problem-reviews";
const assess = vi.hoisted(() => vi.fn());
vi.mock("@/lib/phase-assessment", () => ({ assessPhaseCoverage: assess }));
it("uses an earlier explanation on entering review while advancing only one stage", async () => {
  const p = getProblem("file-storage");
  const example = problemReviews.find((p) => p.problemId === "file-storage");
  if (!p || !example) throw new Error("Missing fixture");
  const started = createInterviewStart(p, "mid");
  const lease = acquireInterviewSession(started.sessionId, started);
  lease.commit({ phaseIndex: 1, coveredCriteria: [] });
  lease.release();
  assess.mockResolvedValue([0, 1]);
  const turn = await prepareInterviewTurn(
    p,
    {
      ...started,
      scene: reviewScene(example),
      messages: [
        {
          role: "user",
          content:
            "An upload has a pending state and only becomes visible after complete verified durable bytes; metadata uses a compare-and-set version check to reject a stale writer.",
          action: "explain",
        },
        {
          role: "user",
          content: "I've finished explaining. Let's discuss.",
          action: "review",
          source: "control",
        },
      ],
    },
    new AbortController().signal,
  );
  try {
    expect(turn.context.coveredCriteria).toEqual([0, 1]);
    expect(turn.context.phase?.id).toBe("transfer-and-versions");
    turn.commit(
      "What if a process crashes between completing bytes and publishing metadata?",
    );
  } finally {
    turn.release();
  }
  const after = acquireInterviewSession(started.sessionId, started);
  try {
    expect(after.state).toEqual({ phaseIndex: 2, coveredCriteria: [0, 1] });
  } finally {
    after.release();
  }
});

it("commits the handoff and one exhausted-stage advance under the same lease", async () => {
  const p = getProblem("file-storage");
  const example = problemReviews.find((p) => p.problemId === "file-storage");
  if (!p || !example) throw Error("Missing fixture");
  const started = createInterviewStart(p, "mid");
  const lease = acquireInterviewSession(started.sessionId, started);
  lease.commit({ phaseIndex: 1, coveredCriteria: [] });
  lease.release();
  assess.mockResolvedValue([0, 1]);
  const turn = await prepareInterviewTurn(
    p,
    {
      ...started,
      scene: reviewScene(example),
      messages: [
        {
          role: "user",
          action: "explain",
          content:
            "The API stores verified durable bytes before publishing metadata with a compare-and-set version check.",
        },
        {
          role: "user",
          source: "control",
          action: "review",
          content: "Done explaining",
        },
      ],
    },
    new AbortController().signal,
  );
  try {
    expect(turn.context.phase?.id).toBe(p.phases[2].id);
    turn.context.advancedPhaseIndex = 3;
    turn.context.phase = p.phases[3];
    turn.commit(
      "What happens if a region loses access to its durable object store?",
    );
  } finally {
    turn.release();
  }
  const after = acquireInterviewSession(started.sessionId, started);
  try {
    expect(after.state).toEqual({ phaseIndex: 3, coveredCriteria: [] });
  } finally {
    after.release();
  }
});
