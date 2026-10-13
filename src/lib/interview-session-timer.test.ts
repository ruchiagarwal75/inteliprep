import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  acquireInterviewEnd,
  acquireInterviewSession,
  createInterviewSession,
  interviewSessionCheckpoint,
} from "@/lib/interview-sessions";
import {
  InterviewSessionError,
  type Session,
} from "@/lib/interview-session-store";
import { unsealSession, sealSession } from "@/lib/session-token";
import { POST as start } from "@/app/api/interview/start/route";
import { POST as resume } from "@/app/api/interview/resume/route";

const selection = { problemId: "single-server-scaling", level: "mid" as const };
const now = Date.parse("2026-10-12T20:00:00.000Z");
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv("INTERVIEW_RESUME_SECRET", "timer-test-secret");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
const request = (body: unknown) =>
  new Request("http://localhost/api/interview/start", {
    method: "POST",
    body: JSON.stringify(body),
  });
function forget(id: string) {
  (
    globalThis as typeof globalThis & {
      inteliprepSessions?: Map<string, Session>;
    }
  ).inteliprepSessions?.delete(id);
}

describe("server-issued interview deadlines", () => {
  it("returns the selected duration and server time without trusting a supplied deadline", async () => {
    const response = await start(
      request({
        ...selection,
        durationMinutes: 1,
        timing: { deadlineAt: "2099-01-01T00:00:00.000Z" },
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.serverTime).toBe(new Date(now).toISOString());
    expect(Date.parse(body.timing.deadlineAt)).toBe(now + 60_000);
    expect(unsealSession(body.resumeToken).timing).toEqual(body.timing);
  });
  it("rejects unsupported duration options", async () => {
    expect(
      (await start(request({ ...selection, durationMinutes: 10 }))).status,
    ).toBe(400);
  });
  it("rejects new chat at expiry but still allows ending and grading", () => {
    const id = createInterviewSession(selection, 1);
    vi.advanceTimersByTime(60_000);
    try {
      acquireInterviewSession(id, selection);
      throw new Error("Expected expiry");
    } catch (cause) {
      expect(cause).toBeInstanceOf(InterviewSessionError);
      expect((cause as InterviewSessionError).code).toBe(
        "INTERVIEW_TIME_EXPIRED",
      );
    }
    const lease = acquireInterviewEnd(id, selection, {
      messages: [{ role: "assistant", content: "Opening" }],
    });
    expect(lease.endedAt).toBe(new Date(now + 60_000).toISOString());
    lease.release();
  });
  it("lets a turn accepted before expiry finish and commit before grading", () => {
    const id = createInterviewSession(selection, 1);
    vi.advanceTimersByTime(59_000);
    const reply = acquireInterviewSession(id, selection);
    vi.advanceTimersByTime(5_000);
    expect(() => acquireInterviewEnd(id, selection, { messages: [] })).toThrow(
      "already in progress",
    );
    reply.commit({ phaseIndex: 1, coveredCriteria: [0] });
    const token = reply.checkpoint();
    reply.release();
    expect(unsealSession(token).phaseIndex).toBe(1);
    const ended = acquireInterviewEnd(id, selection, {
      messages: [{ role: "assistant", content: "Completed reply" }],
    });
    expect(ended.snapshot?.messages[0].content).toBe("Completed reply");
    ended.release();
  });
  it("preserves the original deadline after a server restart and returns fresh clock calibration", async () => {
    const id = createInterviewSession(selection, 1);
    const checkpoint = interviewSessionCheckpoint(id, selection);
    vi.advanceTimersByTime(20_000);
    forget(id);
    const response = await resume(
      request({
        ...selection,
        sessionId: id,
        resumeToken: checkpoint.resumeToken,
        deadlineAt: "2099-01-01T00:00:00.000Z",
      }),
    );
    const body = await response.json();
    expect(body.timing).toEqual(checkpoint.timing);
    expect(body.serverTime).toBe(new Date(now + 20_000).toISOString());
    expect(body.ended).toBe(false);
    vi.advanceTimersByTime(40_000);
    expect(() => acquireInterviewSession(id, selection)).toThrow("Time is up");
  });
  it("does not renew an expired saved interview on resume", async () => {
    const id = createInterviewSession(selection, 1);
    const checkpoint = interviewSessionCheckpoint(id, selection);
    vi.advanceTimersByTime(120_000);
    forget(id);
    const response = await resume(
      request({
        ...selection,
        sessionId: id,
        resumeToken: checkpoint.resumeToken,
      }),
    );
    expect((await response.json()).timing).toEqual(checkpoint.timing);
    expect(() => acquireInterviewSession(id, selection)).toThrow("Time is up");
  });
  it("gives older untimed browser saves a 45-minute deadline once, then persists it", () => {
    const id = crypto.randomUUID();
    const oldToken = sealSession({
      ...selection,
      id,
      phaseIndex: 1,
      coveredCriteria: [0],
    });
    const resumed = interviewSessionCheckpoint(id, selection, oldToken);
    expect(resumed.timing.durationMinutes).toBe(45);
    vi.advanceTimersByTime(60_000);
    forget(id);
    expect(
      interviewSessionCheckpoint(id, selection, resumed.resumeToken).timing,
    ).toEqual(resumed.timing);
  });
});
