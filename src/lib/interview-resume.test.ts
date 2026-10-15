import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInterviewStart, getProblem } from "@/lib/problems";
import {
  acquireInterviewEnd,
  acquireInterviewSession,
  interviewSessionCheckpoint,
} from "@/lib/interview-sessions";
import type { Session } from "@/lib/interview-session-store";
import { POST } from "@/app/api/interview/resume/route";
import {
  interviewResumeRequestSchema,
  interviewResumeResponseSchema,
} from "@/lib/interview-resume";

beforeEach(() => {
  vi.stubEnv("INTERVIEW_RESUME_SECRET", "test-only-stable-secret");
});
afterEach(() => vi.unstubAllEnvs());
function start() {
  const problem = getProblem("single-server-scaling");
  if (!problem) throw new Error("Missing problem");
  return createInterviewStart(problem, "mid");
}
function forget(id: string) {
  (
    globalThis as typeof globalThis & {
      inteliprepSessions?: Map<string, Session>;
    }
  ).inteliprepSessions?.delete(id);
}
const request = (body: unknown) =>
  new Request("http://localhost/api/interview/resume", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

describe("browser-backed server session recovery", () => {
  it("restores committed stage and partial criterion coverage after losing process state", () => {
    const interview = start();
    const lease = acquireInterviewSession(interview.sessionId, interview);
    lease.commit({ phaseIndex: 1, coveredCriteria: [1] });
    const token = lease.checkpoint();
    lease.release();
    forget(interview.sessionId);
    const restored = acquireInterviewSession(
      interview.sessionId,
      interview,
      token,
    );
    expect(restored.state).toEqual({ phaseIndex: 1, coveredCriteria: [1] });
    restored.release();
  });
  it("keeps newer live server progress when a stale checkpoint is supplied", () => {
    const interview = start();
    const lease = acquireInterviewSession(interview.sessionId, interview);
    lease.commit({ phaseIndex: 1, coveredCriteria: [] });
    lease.release();
    expect(
      interviewSessionCheckpoint(
        interview.sessionId,
        interview,
        interview.resumeToken,
      ).phaseIndex,
    ).toBe(1);
  });
  it("rejects a token for another session or difficulty and ignores unsigned phase claims", () => {
    const interview = start();
    forget(interview.sessionId);
    expect(() =>
      acquireInterviewSession(
        crypto.randomUUID(),
        interview,
        interview.resumeToken,
      ),
    ).toThrow("can't be resumed");
    expect(() =>
      acquireInterviewSession(
        interview.sessionId,
        { ...interview, level: "senior" },
        interview.resumeToken,
      ),
    ).toThrow("can't be resumed");
    const parsed = interviewResumeRequestSchema.parse({
      ...interview,
      phaseIndex: 4,
      coveredCriteria: [0, 1, 2],
    });
    expect(parsed).not.toHaveProperty("phaseIndex");
    expect(parsed).not.toHaveProperty("coveredCriteria");
  });
  it("retains ended status, timestamp, and frozen retry evidence across process loss", () => {
    const interview = start();
    const snapshot = {
      messages: [
        { role: "user" as const, content: "I added a load balancer." },
      ],
    };
    const ended = acquireInterviewEnd(interview.sessionId, interview, snapshot);
    const endedAt = ended.endedAt;
    ended.release();
    const token = interviewSessionCheckpoint(
      interview.sessionId,
      interview,
    ).resumeToken;
    forget(interview.sessionId);
    expect(() =>
      acquireInterviewSession(interview.sessionId, interview, token),
    ).toThrow("has ended");
    expect(() =>
      acquireInterviewEnd(interview.sessionId, interview, {
        messages: [interview.openingMessage],
      }),
    ).toThrow("does not match");
    const retry = acquireInterviewEnd(interview.sessionId, interview, snapshot);
    expect(retry.snapshot).toEqual(snapshot);
    expect(retry.endedAt).toBe(endedAt);
    retry.release();
  });
  it("returns public labels and an opaque checkpoint through the resume endpoint", async () => {
    const interview = start();
    forget(interview.sessionId);
    const response = await POST(request(interview));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = interviewResumeResponseSchema.parse(await response.json());
    expect(body.phase).toEqual(interview.phase);
    expect(body.ended).toBe(false);
    expect(Object.keys(body).sort()).toEqual([
      "ended",
      "phase",
      "resumeToken",
      "serverTime",
      "timing",
    ]);
  });
  it("validates invalid JSON, missing selection, unknown problems, and unavailable checkpoints", async () => {
    expect(
      (
        await POST(
          new Request("http://localhost", {
            method: "POST",
            body: "{",
            headers: { "Content-Type": "application/json" },
          }),
        )
      ).status,
    ).toBe(400);
    expect((await POST(request({}))).status).toBe(400);
    const interview = start();
    forget(interview.sessionId);
    expect(
      (await POST(request({ ...interview, problemId: "missing" }))).status,
    ).toBe(404);
    expect(
      (await POST(request({ ...interview, resumeToken: undefined }))).status,
    ).toBe(404);
    expect(
      (await POST(request({ ...interview, resumeToken: "edited-checkpoint" })))
        .status,
    ).toBe(409);
  });
});
