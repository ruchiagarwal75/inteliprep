import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProblem } from "@/lib/problems";
import type { InterviewContext } from "@/lib/interview-instructions";
import type { InterviewProgress } from "@/lib/interview-progress";

const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { create: mocks.create };
  },
}));
const { streamInterviewerReply } = await import("@/lib/llm");

function interview(step: InterviewProgress["step"]): InterviewContext {
  const problem = getProblem("single-server-scaling");
  if (!problem) throw new Error("Missing problem config");
  return {
    problem,
    level: "mid",
    progress: { step, candidateTurns: 2, discussionTurnLimit: 2 },
  };
}
async function reply(context: InterviewContext): Promise<string> {
  const chunks: string[] = [];
  for await (const delta of streamInterviewerReply(
    [{ role: "user", content: "I checked CPU usage" }],
    "Whiteboard: empty.",
    "No diagram changes.",
    undefined,
    undefined,
    context,
  ))
    chunks.push(delta);
  return chunks.join("");
}
beforeEach(() => {
  vi.stubEnv("OPENAI_KEY", "test-key");
  mocks.create.mockReset();
  mocks.create.mockImplementation(async function* () {
    yield {
      type: "response.output_text.delta",
      delta: "That helps identify the bottleneck.",
    };
    yield { type: "response.completed" };
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("drawing handoff streaming", () => {
  it("appends the exact configured invitation after a completed answer even when the model does not invite drawing", async () => {
    const context = interview("invite-drawing");
    expect(await reply(context)).toBe(
      `That helps identify the bottleneck.\n\n${context.problem.drawingPolicy.invitation}`,
    );
    expect(mocks.create.mock.calls[0][0].instructions).toContain(
      "Do not ask another question",
    );
  });
  it.each(["discussion", "drawing", "explaining", "review"] as const)(
    "does not append another invitation during %s",
    async (step) => {
      expect(await reply(interview(step))).toBe(
        "That helps identify the bottleneck.",
      );
    },
  );
  it.each(["response.failed", "response.incomplete"])(
    "never appends a successful handoff after %s",
    async (type) => {
      mocks.create.mockImplementation(async function* () {
        yield { type: "response.output_text.delta", delta: "Partial answer" };
        yield { type };
      });
      await expect(reply(interview("invite-drawing"))).rejects.toThrow(
        "did not complete",
      );
    },
  );
  it("rejects a silently truncated stream without a completion event", async () => {
    mocks.create.mockImplementation(async function* () {
      yield { type: "response.output_text.delta", delta: "Partial answer" };
    });
    await expect(reply(interview("invite-drawing"))).rejects.toThrow(
      "did not complete",
    );
  });
  it("can deliver the configured invitation when the completed model reply contains no acknowledgement", async () => {
    mocks.create.mockImplementation(async function* () {
      yield { type: "response.completed" };
    });
    const context = interview("invite-drawing");
    expect((await reply(context)).trim()).toBe(
      context.problem.drawingPolicy.invitation,
    );
  });
  it("removes the model's extra question but preserves scale facts before the handoff", async () => {
    mocks.create.mockImplementation(async function* () {
      yield {
        type: "response.output_text.delta",
        delta: "Plan for 1,000 requests per second. ",
      };
      yield {
        type: "response.output_text.delta",
        delta: "How would you reduce CPU usage?",
      };
      yield { type: "response.completed" };
    });
    const context = interview("invite-drawing");
    const displayed = await reply(context);
    expect(displayed).toBe(
      `Plan for 1,000 requests per second.\n\n${context.problem.drawingPolicy.invitation}`,
    );
    expect(displayed).not.toContain("?");
  });
  it("waits instead of displaying another question on a still-blank canvas", async () => {
    mocks.create.mockImplementation(async function* () {
      yield {
        type: "response.output_text.delta",
        delta: "How would you route traffic?",
      };
      yield { type: "response.completed" };
    });
    const displayed = await reply(interview("drawing"));
    expect(displayed).toContain("Take your time with the whiteboard");
    expect(displayed).not.toContain("?");
  });
  it("lets the candidate finish explaining instead of emitting a follow-up", async () => {
    mocks.create.mockImplementation(async function* () {
      yield {
        type: "response.output_text.delta",
        delta: "Why did you choose that server?",
      };
      yield { type: "response.completed" };
    });
    const displayed = await reply(interview("explaining"));
    expect(displayed).toContain("Go ahead with your explanation");
    expect(displayed).not.toContain("?");
    expect(mocks.create.mock.calls[0][0].instructions).toContain(
      "Do not assume one message completes the explanation",
    );
  });
});
