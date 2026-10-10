import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProblem } from "@/lib/problems";
import basicScene from "@/lib/fixtures/basic-system.json";

const mocks = vi.hoisted(() => ({
  streamInterviewerReply: vi.fn(),
  hasApiKey: vi.fn(),
}));
vi.mock("@/lib/llm", () => mocks);
const { POST } = await import("@/app/api/chat/route");
const messages = [
  { role: "user", content: "CPU is high" },
  { role: "assistant", content: "What did you measure?" },
  { role: "user", content: "95 percent" },
];

function post(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problemId: "single-server-scaling",
        level: "mid",
        messages,
        scene: { elements: [] },
        ...body,
      }),
    }),
  );
}
beforeEach(() => {
  mocks.hasApiKey.mockReturnValue(true);
  mocks.streamInterviewerReply.mockReset();
  mocks.streamInterviewerReply.mockImplementation(async function* () {
    yield "Reply";
  });
});

describe("POST /api/chat drawing progress", () => {
  it("derives handoff from the server problem policy and history, ignoring client phase claims", async () => {
    const response = await post({ interview_progress: { step: "review" } });
    expect(response.status).toBe(200);
    expect(mocks.streamInterviewerReply.mock.calls[0][5].progress).toEqual({
      step: "invite-drawing",
      candidateTurns: 2,
      discussionTurnLimit: 2,
    });
  });
  it("does not mistake a partial diagram for permission to ask review questions", async () => {
    await post({ messages: [messages[0]], scene: basicScene });
    expect(mocks.streamInterviewerReply.mock.calls[0][5].progress.step).toBe(
      "drawing",
    );
  });
  it.each([
    ["draw", "drawing"],
    ["explain", "explaining"],
    ["review", "review"],
  ])(
    "honors the validated candidate pacing action %s",
    async (action, step) => {
      await post({
        messages: [{ role: "user", content: "Change my pace", action }],
        scene: basicScene,
      });
      expect(mocks.streamInterviewerReply.mock.calls[0][5].progress.step).toBe(
        step,
      );
    },
  );
  it("waits rather than returning to questions after the handoff while the canvas is blank", async () => {
    const problem = getProblem("single-server-scaling");
    if (!problem) throw new Error("Missing problem config");
    await post({
      messages: [
        ...messages,
        {
          role: "assistant",
          content: `Acknowledged.\n\n${problem.drawingPolicy.invitation}`,
        },
        { role: "user", content: "Okay" },
      ],
    });
    expect(mocks.streamInterviewerReply.mock.calls[0][5].progress.step).toBe(
      "drawing",
    );
  });
});
