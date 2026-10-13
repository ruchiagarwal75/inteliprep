import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProblem } from "@/lib/problems";
import type { InterviewContext } from "@/lib/interview-instructions";

const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { create: mocks.create };
  },
}));
const { streamInterviewerReply } = await import("@/lib/llm");
const problem = getProblem("single-server-scaling");
if (!problem) throw new Error("Missing problem");
const context: InterviewContext = {
  problem,
  level: "mid",
  phase: problem.phases[0],
  coveredCriteria: [0, 2],
  progress: { step: "discussion", candidateTurns: 3, discussionTurnLimit: 2 },
};

function stream(content: string, interview = context, signal?: AbortSignal) {
  return streamInterviewerReply(
    [{ role: "user", content }],
    "Whiteboard: empty",
    "No changes",
    signal,
    undefined,
    interview,
  );
}
async function reply(content: string, interview = context) {
  const chunks = [];
  for await (const chunk of stream(content, interview)) chunks.push(chunk);
  return chunks.join("");
}
beforeEach(() => {
  vi.stubEnv("OPENAI_KEY", "test-key");
  mocks.create.mockReset().mockImplementation(async function* () {
    yield {
      type: "response.output_text.delta",
      delta:
        "Traffic grows from 10 to 1,000 requests per second. How would you identify the bottleneck?",
    };
    yield { type: "response.completed" };
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("requirements-stage reply control", () => {
  it.each(["Okay", "Yes.", "Okay, thanks!", "Got it"])(
    "answers bare %s with the next missing requirement, without a model design follow-up",
    async (content) => {
      expect(await reply(content)).toBe(
        problem.phases[0].clarificationQuestions?.[1],
      );
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );
  it("answers configured facts without asking the candidate to repeat them", async () => {
    expect(await reply("What traffic should I expect?")).toBe(
      problem.clarifications[0].answers.mid,
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("uses the next uncovered criterion rather than repeating confirmed requirements", async () => {
    expect(await reply("Okay", { ...context, coveredCriteria: [0, 1] })).toBe(
      problem.phases[0].clarificationQuestions?.[2],
    );
  });
  it.each(["drawing", "explaining"] as const)(
    "keeps questions paused during %s even with requirements missing",
    async (step) => {
      const interview = {
        ...context,
        progress: { step, candidateTurns: 3, discussionTurnLimit: 2 },
      };
      expect(await reply("What traffic should I expect?", interview)).toBe(
        problem.clarifications[0].answers.mid,
      );
    },
  );
  it("does not emit a configured question or factual partial reply when the provider fails", async () => {
    mocks.create.mockImplementation(async function* () {
      yield { type: "response.output_text.delta", delta: "Partial facts." };
      yield { type: "response.failed" };
    });
    await expect(
      stream("What types of pages do visitors open?").next(),
    ).rejects.toThrow("did not complete");
  });
  it("honors cancellation before answering a bare acknowledgement", async () => {
    const abort = new AbortController();
    abort.abort();
    await expect(
      stream("Okay", context, abort.signal).next(),
    ).rejects.toThrow();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
