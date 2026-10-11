import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInterviewStart, getProblem } from "@/lib/problems";
import { acquireInterviewSession } from "@/lib/interview-sessions";
import { readInterviewPhase } from "@/lib/interview-phase";
import type { ChatMessage } from "@/lib/chat";
import basicScene from "@/lib/fixtures/basic-system.json";

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
const history: ChatMessage[] = [
  { role: "user", content: "CPU is high" },
  { role: "assistant", content: "What did you measure?" },
  { role: "user", content: "95 percent" },
];
function start() {
  return createInterviewStart(problem, "mid");
}
function post(sessionId: string, messages = history, extra = {}) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
function state(sessionId: string) {
  const lease = acquireInterviewSession(sessionId, selection);
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
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("server-owned interview stages", () => {
  it("walks through all five stages and preserves drawing/explanation pauses within discussion", async () => {
    const interview = start();
    expect(interview.phase.position).toBe(1);
    const drawing = await post(interview.sessionId);
    expect(readInterviewPhase(drawing.headers)?.position).toBe(2);
    await drawing.text();
    const ready: ChatMessage[] = [
      ...history,
      { role: "user", content: "Let's discuss", action: "review" },
    ];
    const discussion = await post(interview.sessionId, ready, {
      scene: basicScene,
    });
    await discussion.text();
    expect(state(interview.sessionId).phaseIndex).toBe(2);
    expect(mocks.assessPhaseCoverage).not.toHaveBeenCalled();
    for (const action of ["draw", "explain"] as const) {
      const paused = await post(
        interview.sessionId,
        [...ready, { role: "user", content: "Give me the floor", action }],
        { scene: basicScene },
      );
      await paused.text();
      expect(readInterviewPhase(paused.headers)?.position).toBe(3);
      expect(state(interview.sessionId).phaseIndex).toBe(2);
      expect(mocks.assessPhaseCoverage).not.toHaveBeenCalled();
    }
    mocks.assessPhaseCoverage
      .mockResolvedValueOnce([0])
      .mockResolvedValueOnce([1]);
    await (
      await post(interview.sessionId, ready, { scene: basicScene })
    ).text();
    expect(state(interview.sessionId)).toEqual({
      phaseIndex: 2,
      coveredCriteria: [0],
    });
    const validation = await post(interview.sessionId, ready, {
      scene: basicScene,
    });
    await validation.text();
    expect(readInterviewPhase(validation.headers)?.id).toBe("validate-results");
    mocks.assessPhaseCoverage.mockResolvedValue([0, 1]);
    const wrap = await post(interview.sessionId, ready, { scene: basicScene });
    await wrap.text();
    expect(readInterviewPhase(wrap.headers)?.position).toBe(5);
    expect(
      mocks.streamInterviewerReply.mock.calls.at(-1)?.[5].phase.transition,
    ).toBe("wrap-up");
    expect(JSON.stringify(readInterviewPhase(wrap.headers))).not.toContain(
      "completionCriteria",
    );
  });
  it("rejects missing sessions, changed selections, and concurrent turns", async () => {
    const interview = start();
    expect((await post("8e0e77aa-c872-4f82-a1b5-0a6b38ca27cb")).status).toBe(
      404,
    );
    expect(
      (await post(interview.sessionId, history, { level: "staff" })).status,
    ).toBe(409);
    const lease = acquireInterviewSession(interview.sessionId, selection);
    expect((await post(interview.sessionId)).status).toBe(409);
    lease.release();
  });
  it("ignores client phase claims and never commits an interrupted or empty reply", async () => {
    const interview = start();
    mocks.streamInterviewerReply.mockImplementation(async function* () {
      yield "Partial";
      throw new Error("Lost connection");
    });
    const failed = await post(interview.sessionId, history, {
      phase: { id: "wrap-up", position: 5 },
      coveredCriteria: [0, 1],
    });
    await expect(failed.text()).rejects.toThrow("Lost connection");
    expect(state(interview.sessionId).phaseIndex).toBe(0);
    mocks.streamInterviewerReply.mockImplementation(async function* () {
      yield "";
    });
    const empty = await post(interview.sessionId);
    await expect(empty.text()).rejects.toThrow("empty reply");
    expect(state(interview.sessionId).phaseIndex).toBe(0);
    mocks.streamInterviewerReply.mockImplementation(async function* () {
      yield "Reply";
    });
    await (await post(interview.sessionId)).text();
    expect(state(interview.sessionId).phaseIndex).toBe(1);
  });
  it("keeps the stage when classification fails, then retries on a later review turn", async () => {
    const interview = start();
    const lease = acquireInterviewSession(interview.sessionId, selection);
    lease.commit({ phaseIndex: 1, coveredCriteria: [] });
    lease.release();
    const ready: ChatMessage[] = [
      { role: "user", content: "Let's discuss", action: "review" },
    ];
    await (
      await post(interview.sessionId, ready, { scene: basicScene })
    ).text();
    mocks.assessPhaseCoverage.mockRejectedValueOnce(new Error("Unavailable"));
    await (
      await post(interview.sessionId, ready, { scene: basicScene })
    ).text();
    expect(state(interview.sessionId).phaseIndex).toBe(2);
    mocks.assessPhaseCoverage.mockResolvedValueOnce([0, 1]);
    await (
      await post(interview.sessionId, ready, { scene: basicScene })
    ).text();
    expect(state(interview.sessionId).phaseIndex).toBe(3);
  });
});
