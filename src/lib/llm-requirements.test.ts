import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProblem } from "@/lib/problems";
import type { InterviewContext } from "@/lib/interview-instructions";

const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", async (original) => ({
  ...(await original<typeof import("openai")>()),
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
  it("does not drop the freshness part of a multi-question clarification", async () => {
    const displayed = await reply(
      "What is the traffic and target response time? Is it OK if updates take a few seconds to show up?",
    );
    expect(displayed).toContain(problem.clarifications[0].answers.mid);
    expect(displayed).toContain(problem.clarifications[1].answers.mid);
    expect(mocks.create).not.toHaveBeenCalled();
  });
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
    expect(await reply("What traffic should I expect?")).toContain(
      problem.clarifications[0].answers.mid,
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("uses the next uncovered criterion rather than repeating confirmed requirements", async () => {
    expect(await reply("Okay", { ...context, coveredCriteria: [0, 1] })).toBe(
      problem.phases[0].clarificationQuestions?.[2],
    );
  });
  it("does not ask for goals supplied in the same generated reply", async () => {
    mocks.create.mockImplementation(async function* () {
      yield {
        type: "response.output_text.delta",
        delta:
          "Assume traffic grows from 10 to 1,000 requests per second, with pages completing in under 500 milliseconds. What traffic-growth and response-time goals are you using?",
      };
      yield { type: "response.completed" };
    });
    const displayed = await reply(
      "What incoming load should the website handle?",
    );
    expect(displayed).toContain("under 500 milliseconds");
    expect(displayed).toContain(problem.drawingPolicy.invitation);
    expect(displayed).not.toContain("What traffic-growth");
    expect(displayed).not.toContain("?");
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

it("never tells a candidate to draw while still holding the clarify minimum", async () => {
  mocks.create.mockImplementation(async function* () {
    yield {
      type: "response.output_text.delta",
      delta: "Which requirement matters most?",
    };
    yield { type: "response.completed" };
  });
  const displayed = await reply("I have confirmed the service goals.", {
    ...context,
    coveredCriteria: [0, 1, 2],
    mayInviteDrawing: false,
  });
  expect(displayed).toContain("Start drawing");
  expect(displayed).not.toContain("Ready to explain");
  expect(displayed).not.toContain("?");
});

it("canonicalizes the browser-observed handoff and never re-appends answered latency goals", async () => {
  const p = getProblem("url-shortener");
  if (!p) throw Error("Missing problem");
  mocks.create.mockImplementation(async function* () {
    yield {
      type: "response.output_text.delta",
      delta:
        "Great, you've covered all core requirements. Whenever you're ready, start your design by drawing the main components and explaining how they'll handle link creation and redirects.",
    };
    yield { type: "response.completed" };
  });
  const question = p.phases[0].clarificationQuestions?.[1] ?? "";
  const messages = [
    { role: "assistant" as const, content: question },
    {
      role: "user" as const,
      content:
        "I will target p99 redirects under 100 ms and 99.9% availability.",
    },
  ];
  const interview = {
    ...context,
    problem: p,
    phase: p.phases[0],
    coveredCriteria: [0, 2],
    mayInviteDrawing: false,
  };
  let displayed = "";
  for await (const chunk of streamInterviewerReply(
    messages,
    "Empty board",
    "No changes",
    undefined,
    undefined,
    interview,
  ))
    displayed += chunk;
  expect(displayed).toBe(p.drawingPolicy.invitation);
  expect(displayed).not.toContain("?");
});
it("does not repeat an answered configured question if the coverage assessor is unavailable", async () => {
  mocks.create.mockImplementation(async function* () {
    yield {
      type: "response.output_text.delta",
      delta: "Those goals are reasonable.",
    };
    yield { type: "response.completed" };
  });
  const question = problem.phases[0].clarificationQuestions?.[1] ?? "";
  const messages = [
    { role: "assistant" as const, content: question },
    {
      role: "user" as const,
      content: "I will target 500 ms and 99.9% availability.",
    },
  ];
  let displayed = "";
  for await (const chunk of streamInterviewerReply(
    messages,
    "Empty",
    "No changes",
    undefined,
    undefined,
    context,
  ))
    displayed += chunk;
  expect(displayed).not.toContain(question);
  expect(displayed).toContain("Start drawing");
});
