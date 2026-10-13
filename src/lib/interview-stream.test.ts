import { describe, expect, it, vi } from "vitest";
import { receiveInterviewStream } from "@/lib/interview-stream";
import { chatResponse } from "@/lib/chat-response";
import { unsealSession } from "@/lib/session-token";
import { acquireInterviewSession } from "@/lib/interview-sessions";
import { createInterviewStart, getProblem } from "@/lib/problems";

const encoder = new TextEncoder();
const delta = JSON.stringify({ type: "delta", text: "API → database" }) + "\n";
const complete =
  JSON.stringify({
    type: "complete",
    resumeToken: "checkpoint",
    phase: { id: "drawing", title: "Drawing", position: 2, total: 5 },
  }) + "\n";
function stream(text: string) {
  const bytes = encoder.encode(text);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let offset = 0; offset < bytes.length; offset += 3)
        controller.enqueue(bytes.slice(offset, offset + 3));
      controller.close();
    },
  });
}

describe("completed-turn checkpoint stream", () => {
  it("handles arbitrary byte boundaries and Unicode and commits after successful EOF", async () => {
    const chunks: string[] = [];
    const result = await receiveInterviewStream(
      stream(delta + complete),
      (text) => chunks.push(text),
    );
    expect(result.reply).toBe("API → database");
    expect(chunks.join("")).toBe(result.reply);
    expect(result.checkpoint.resumeToken).toBe("checkpoint");
  });
  it.each([
    delta,
    complete,
    delta + complete + delta,
    delta + complete.slice(0, -1),
  ])("rejects truncated, empty, or out-of-order streams", async (text) => {
    await expect(
      receiveInterviewStream(stream(text), () => {}),
    ).rejects.toThrow();
  });
  it("does not accept a checkpoint if the stream errors after its completion frame", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(delta + complete));
      },
      pull(controller) {
        controller.error(new Error("Connection lost"));
      },
    });
    await expect(receiveInterviewStream(body, () => {})).rejects.toThrow(
      "Connection lost",
    );
  });
  it("issues the checkpoint from committed state after the completed model reply", async () => {
    const problem = getProblem("single-server-scaling");
    if (!problem) throw new Error("Missing problem");
    const interview = createInterviewStart(problem, "mid");
    const lease = acquireInterviewSession(interview.sessionId, interview);
    async function* deltas() {
      yield "You can start drawing.";
    }
    const iterator = deltas();
    const response = chatResponse(
      iterator,
      await iterator.next(),
      {},
      () => lease.commit({ phaseIndex: 1, coveredCriteria: [] }),
      lease.release,
      vi.fn(),
      () => ({ resumeToken: lease.checkpoint() }),
    );
    if (!response.body) throw new Error("Missing body");
    const result = await receiveInterviewStream(response.body, () => {});
    expect(unsealSession(result.checkpoint.resumeToken ?? "").phaseIndex).toBe(
      1,
    );
  });
  it("never emits a completion frame for an interrupted provider reply", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    async function* deltas() {
      yield "Partial";
      throw new Error("Provider interrupted");
    }
    const iterator = deltas(),
      commit = vi.fn(),
      checkpoint = vi.fn();
    const response = chatResponse(
      iterator,
      await iterator.next(),
      {},
      commit,
      vi.fn(),
      vi.fn(),
      checkpoint,
    );
    if (!response.body) throw new Error("Missing body");
    await expect(
      receiveInterviewStream(response.body, () => {}),
    ).rejects.toThrow("Provider interrupted");
    expect(commit).not.toHaveBeenCalled();
    expect(checkpoint).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
