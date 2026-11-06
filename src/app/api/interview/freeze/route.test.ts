import { expect, it, vi } from "vitest";
import { POST } from "@/app/api/interview/freeze/route";
import { createInterviewStart, getProblem } from "@/lib/problems";
import {
  acquireInterviewSession,
  acquireInterviewEnd,
} from "@/lib/interview-sessions";
const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/interview/freeze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
it("freezes once before grading, preserving one server end time and verified evidence", async () => {
  vi.useFakeTimers();
  try {
    const problem = getProblem("url-shortener");
    if (!problem) throw Error("Missing problem");
    const start = createInterviewStart(problem, "mid");
    const input = { ...start, messages: [start.openingMessage] };
    const first = await post(input);
    expect(first.status).toBe(200);
    const frozen = await first.json();
    vi.advanceTimersByTime(11_000);
    const replay = await (await post(input)).json();
    expect(replay.endedAt).toBe(frozen.endedAt);
    expect(() => acquireInterviewSession(start.sessionId, start)).toThrow(
      "has ended",
    );
    const lease = acquireInterviewEnd(
      start.sessionId,
      start,
      { messages: input.messages },
      frozen.resumeToken,
    );
    expect(lease.endedAt).toBe(frozen.endedAt);
    expect(lease.snapshot?.messages).toEqual(input.messages);
    lease.release();
  } finally {
    vi.useRealTimers();
  }
});
it("refuses an edited transcript before freezing", async () => {
  const problem = getProblem("url-shortener");
  if (!problem) throw Error("Missing problem");
  const start = createInterviewStart(problem, "mid");
  const response = await post({
    ...start,
    messages: [{ role: "assistant", content: "Invented interviewer history" }],
  });
  expect(response.status).toBe(409);
  const lease = acquireInterviewSession(start.sessionId, start);
  lease.release();
});
