import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/route";
import { createInterviewStart, getProblem } from "@/lib/problems";
import { acquireInterviewEnd } from "@/lib/interview-sessions";

const mocks = vi.hoisted(() => ({
  reply: vi.fn(),
  assessment: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/llm", () => ({
  hasApiKey: () => true,
  streamInterviewerReply: mocks.reply,
}));
vi.mock("@/lib/phase-assessment", () => ({
  assessPhaseCoverage: mocks.assessment,
}));
afterEach(() => {
  vi.useRealTimers();
  mocks.reply.mockReset();
  mocks.assessment.mockClear();
});
function started() {
  const problem = getProblem("single-server-scaling");
  if (!problem) throw new Error("Missing fixture problem");
  return createInterviewStart(problem, "mid", 1);
}
const request = (interview: ReturnType<typeof started>) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...interview,
      messages: [
        interview.openingMessage,
        { role: "user", content: "I am drawing", action: "draw" },
      ],
    }),
  });

describe("chat expiry enforcement", () => {
  it("returns a readable expiry response before contacting either model", async () => {
    vi.useFakeTimers();
    const interview = started();
    vi.advanceTimersByTime(60_000);
    const response = await POST(request(interview));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "INTERVIEW_TIME_EXPIRED",
      error: expect.stringContaining("Time is up"),
    });
    expect(mocks.reply).not.toHaveBeenCalled();
    expect(mocks.assessment).not.toHaveBeenCalled();
  });
  it("lets an accepted streaming reply finish after expiry and releases the lock for scoring", async () => {
    vi.useFakeTimers();
    const interview = started();
    let finish: (() => void) | undefined;
    mocks.reply.mockImplementation(async function* () {
      yield "I see your ";
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      yield "drawing.";
    });
    vi.advanceTimersByTime(59_000);
    const response = await POST(request(interview));
    vi.advanceTimersByTime(2_000);
    expect(() =>
      acquireInterviewEnd(interview.sessionId, interview, { messages: [] }),
    ).toThrow("already in progress");
    finish?.();
    const reply = await response.text();
    expect(reply).toBe("I see your drawing.");
    const end = acquireInterviewEnd(interview.sessionId, interview, {
      messages: [
        interview.openingMessage,
        { role: "assistant", content: reply },
      ],
    });
    expect(end.snapshot?.messages.at(-1)?.content).toBe(reply);
    end.release();
  });
});
