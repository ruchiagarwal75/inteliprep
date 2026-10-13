import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInterviewStart, getProblem } from "@/lib/problems";
import { acquireInterviewSession } from "@/lib/interview-sessions";
import { readInterviewPhase } from "@/lib/interview-phase";
import type { ChatMessage } from "@/lib/chat";
import basicScene from "@/lib/fixtures/basic-system.json";
import {
  INTERVIEW_STREAM_TYPE,
  receiveInterviewStream,
} from "@/lib/interview-stream";
import { unsealSession } from "@/lib/session-token";

const mocks = vi.hoisted(() => ({
  streamInterviewerReply: vi.fn(),
  hasApiKey: vi.fn(),
  assessPhaseCoverage: vi.fn(),
}));
vi.mock("@/lib/llm", () => ({
  streamInterviewerReply: mocks.streamInterviewerReply,
  hasApiKey: mocks.hasApiKey,
}));
vi.mock("@/lib/phase-assessment", () => ({
  assessPhaseCoverage: mocks.assessPhaseCoverage,
}));
const { POST } = await import("@/app/api/chat/route");
const selected = getProblem("single-server-scaling");
if (!selected) throw new Error("Missing problem");
const problem = selected;
const selection = { problemId: problem.id, level: "mid" as const };
function post(sessionId: string, messages: ChatMessage[], extra = {}) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: INTERVIEW_STREAM_TYPE,
      },
      body: JSON.stringify({
        ...selection,
        sessionId,
        messages,
        scene: { elements: [] },
        ...extra,
      }),
    }),
  );
}
function state(id: string) {
  const lease = acquireInterviewSession(id, selection);
  lease.release();
  return lease.state;
}
beforeEach(() => {
  mocks.hasApiKey.mockReturnValue(true);
  mocks.assessPhaseCoverage.mockReset().mockResolvedValue([]);
  mocks.streamInterviewerReply
    .mockReset()
    .mockImplementation(async function* () {
      yield "Reply";
    });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("requirements checkpoint before drawing-stage progression", () => {
  it("commits facts supplied by the completed reply and returns the updated stage and checkpoint together", async () => {
    const interview = createInterviewStart(problem, "mid");
    mocks.streamInterviewerReply.mockImplementation(async function* () {
      yield "Traffic grows from 10 to 1,000 requests per second; pages should respond within 500 milliseconds.";
    });
    const response = await post(interview.sessionId, [
      {
        role: "user",
        content: "What incoming load should the website handle?",
      },
    ]);
    if (!response.body) throw new Error("Missing body");
    const completed = await receiveInterviewStream(response.body, () => {});
    expect(completed.checkpoint.phase?.id).toBe("draw-and-explain");
    expect(
      unsealSession(completed.checkpoint.resumeToken ?? "").phaseIndex,
    ).toBe(1);
    expect(state(interview.sessionId).phaseIndex).toBe(1);
  });
  it("marks continuing explanations for quiet listening, but answers factual questions normally", async () => {
    const interview = createInterviewStart(problem, "mid");
    const history: ChatMessage[] = [
      {
        role: "user",
        content: "I'm ready to explain my design",
        action: "explain",
        source: "control",
      },
    ];
    const response = await post(interview.sessionId, [
      ...history,
      {
        role: "user",
        content: "Requests reach the first app server and its database.",
      },
    ]);
    if (!response.body) throw new Error("Missing body");
    const completed = await receiveInterviewStream(response.body, () => {});
    expect(response.headers.get("X-Interview-Reply-Kind")).toBe("listening");
    expect(completed.checkpoint.replyKind).toBe("listening");
    expect(mocks.streamInterviewerReply.mock.calls[0][5].listening).toBe(true);
    const clarification = await post(interview.sessionId, [
      ...history,
      { role: "user", content: "Is read staleness allowed?" },
    ]);
    expect(clarification.headers.get("X-Interview-Reply-Kind")).toBeNull();
    await clarification.text();
  });
  it.each(["draw", "explain"] as const)(
    "preserves %s and keeps the first stage while requirements are incomplete",
    async (action) => {
      const interview = createInterviewStart(problem, "mid");
      mocks.assessPhaseCoverage.mockResolvedValueOnce([0]);
      const response = await post(
        interview.sessionId,
        [
          {
            role: "user",
            content:
              "The website serves pages and saves updates on one machine. Give me the floor.",
            action,
          },
        ],
        { scene: basicScene },
      );
      await response.text();
      expect(readInterviewPhase(response.headers)?.position).toBe(1);
      expect(state(interview.sessionId)).toEqual({
        phaseIndex: 0,
        coveredCriteria: [0, 2],
      });
      expect(mocks.streamInterviewerReply.mock.calls[0][5].progress.step).toBe(
        action === "draw" ? "drawing" : "explaining",
      );
      expect(mocks.assessPhaseCoverage.mock.calls[0][0].transition).toBe(
        "initial",
      );
    },
  );
  it("does not let the message limit or client coverage claims complete requirements", async () => {
    const interview = createInterviewStart(problem, "mid");
    const messages: ChatMessage[] = Array.from({ length: 8 }, () => ({
      role: "user",
      content: "Still thinking",
    }));
    const response = await post(interview.sessionId, messages, {
      coveredCriteria: [0, 1, 2],
      phase: { position: 2 },
    });
    await response.text();
    expect(state(interview.sessionId).phaseIndex).toBe(0);
    expect(mocks.streamInterviewerReply.mock.calls[0][5].progress.step).toBe(
      "discussion",
    );
    expect(readInterviewPhase(response.headers)?.id).toBe(
      "clarify-requirements",
    );
  });
  it("uses premature review permission to clarify missing performance goals instead of probing the diagram", async () => {
    const interview = createInterviewStart(problem, "mid");
    mocks.assessPhaseCoverage.mockResolvedValueOnce([0]);
    const response = await post(
      interview.sessionId,
      [
        {
          role: "user",
          content:
            "The app and data stay on one server. I'll use the traffic and response-time goals. Let's discuss.",
          action: "review",
        },
      ],
      { scene: basicScene },
    );
    await response.text();
    const context = mocks.streamInterviewerReply.mock.calls[0][5];
    expect(context.phase.transition).toBe("initial");
    expect(context.progress.step).toBe("discussion");
    expect(context.coveredCriteria).toEqual([0, 2]);
  });
  it("accumulates confirmations, then delivers the drawing handoff", async () => {
    const interview = createInterviewStart(problem, "mid");
    mocks.assessPhaseCoverage
      .mockResolvedValueOnce([0])
      .mockResolvedValueOnce([1, 2]);
    const messages: ChatMessage[] = [
      {
        role: "user",
        content:
          "The website serves pages and saves updates, with app and data on one server.",
      },
    ];
    await (await post(interview.sessionId, messages)).text();
    expect(state(interview.sessionId)).toEqual({
      phaseIndex: 0,
      coveredCriteria: [0, 2],
    });
    messages.push({
      role: "user",
      content:
        "I'll use the agreed traffic and latency goals and keep existing data available and correct.",
    });
    const complete = await post(interview.sessionId, messages);
    await complete.text();
    expect(state(interview.sessionId)).toEqual({
      phaseIndex: 1,
      coveredCriteria: [],
    });
    expect(readInterviewPhase(complete.headers)?.position).toBe(2);
    expect(
      mocks.streamInterviewerReply.mock.calls.at(-1)?.[5].progress.step,
    ).toBe("invite-drawing");
  });
  it("credits requirements confirmed during an explanation without unpausing questions", async () => {
    const interview = createInterviewStart(problem, "mid");
    mocks.assessPhaseCoverage.mockResolvedValueOnce([0, 1, 2]);
    const messages: ChatMessage[] = [
      {
        role: "user",
        content:
          "I confirm the website scope, agreed traffic and response-time targets, and preserving existing data.",
        action: "explain",
      },
    ];
    const response = await post(interview.sessionId, messages, {
      scene: basicScene,
    });
    await response.text();
    expect(state(interview.sessionId).phaseIndex).toBe(1);
    expect(mocks.streamInterviewerReply.mock.calls[0][5].progress.step).toBe(
      "explaining",
    );
    messages.push({
      role: "user",
      content: "I've finished explaining. Let's discuss.",
      action: "review",
    });
    await (
      await post(interview.sessionId, messages, { scene: basicScene })
    ).text();
    expect(state(interview.sessionId).phaseIndex).toBe(2);
    expect(mocks.assessPhaseCoverage).toHaveBeenCalledOnce();
  });
  it("keeps requirements open on assessment failure and retries without skipping stages", async () => {
    const interview = createInterviewStart(problem, "mid");
    mocks.assessPhaseCoverage
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockResolvedValueOnce([0, 1, 2]);
    const messages: ChatMessage[] = [
      {
        role: "user",
        content:
          "I confirm the starting scope, traffic and latency goals, and keeping data available.",
      },
    ];
    await (await post(interview.sessionId, messages)).text();
    expect(state(interview.sessionId).phaseIndex).toBe(0);
    const retried = await post(interview.sessionId, messages);
    await retried.text();
    expect(state(interview.sessionId).phaseIndex).toBe(1);
    expect(
      mocks.streamInterviewerReply.mock.calls.at(-1)?.[5].progress.step,
    ).toBe("invite-drawing");
  });
});
