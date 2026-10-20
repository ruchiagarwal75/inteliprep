import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as start } from "@/app/api/interview/start/route";
import { POST as chat } from "@/app/api/chat/route";
import { POST as resume } from "@/app/api/interview/resume/route";
import { POST as end } from "@/app/api/interview/end/route";
import { interviewStartSchema } from "@/lib/interview-selection";
import { interviewResumeResponseSchema } from "@/lib/interview-resume";
import { interviewEndResponseSchema } from "@/lib/scorecard";
import { receiveInterviewStream } from "@/lib/interview-stream";
import { unsealSession } from "@/lib/session-token";
import { interviewSessionState } from "@/lib/interview-session-context";
import { getProblem } from "@/lib/problems";
import { redisSessionCommand } from "@/lib/fixtures/redis-session-test";
import {
  gradingSelection,
  gradingSnapshot,
  scorecardFixture,
} from "@/lib/fixtures/scorecard-test";

const mocks = vi.hoisted(() => ({
  redis: vi.fn(),
  reply: vi.fn(),
  assess: vi.fn(),
  grade: vi.fn(),
}));
vi.mock("@/lib/redis-rest", () => ({ redisCommand: mocks.redis }));
vi.mock("@/lib/llm", () => ({
  hasApiKey: () => true,
  streamInterviewerReply: mocks.reply,
}));
vi.mock("@/lib/phase-assessment", () => ({
  assessPhaseCoverage: mocks.assess,
}));
vi.mock("@/lib/interview-grading", () => ({ gradeInterview: mocks.grade }));
const values = new Map<string, string>();
const scopes = new Set<ReadonlyMap<string, unknown>>();

beforeEach(() => {
  for (const [key, value] of Object.entries({
    VERCEL: "1",
    VERCEL_ENV: "preview",
    OPENAI_KEY: "test-key",
    INTERVIEW_RESUME_SECRET: "s".repeat(32),
    UPSTASH_REDIS_REST_URL: "https://redis.example",
    UPSTASH_REDIS_REST_TOKEN: "test-token",
  }))
    vi.stubEnv(key, value);
  values.clear();
  scopes.clear();
  const command = redisSessionCommand(values);
  mocks.redis
    .mockReset()
    .mockImplementation(async (args: (string | number)[]) => {
      // Every route must begin with an empty working copy before reading Redis.
      if (args[0] === "GET") expect(interviewSessionState().size).toBe(0);
      if (!String(args[1]).includes("INCR"))
        scopes.add(interviewSessionState());
      return command(args);
    });
  mocks.reply.mockReset();
  const problem = getProblem(gradingSelection.problemId);
  if (!problem) throw new Error("Missing fixture problem");
  mocks.assess
    .mockReset()
    .mockResolvedValue(
      problem.phases[0].completionCriteria.map((_, index) => index),
    );
  mocks.grade.mockReset().mockResolvedValue(scorecardFixture());
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  for (const scope of scopes) expect(scope.size).toBe(0);
});

const request = (path: string, body: unknown) =>
  new Request(`https://beta.example${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/x-ndjson",
      "x-vercel-forwarded-for": "203.0.113.1",
    },
    body: JSON.stringify(body),
  });
async function started() {
  const response = await start(
    request("/api/interview/start", gradingSelection),
  );
  expect(response.status).toBe(200);
  return interviewStartSchema.parse(await response.json());
}

describe("beta lifecycle without a process session cache", () => {
  it("streams after the handler returns, then resumes and reuses scored feedback in fresh requests", async () => {
    const interview = await started();
    let finish: (() => void) | undefined;
    mocks.reply.mockImplementation(async function* () {
      yield "Go ahead ";
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      yield "and draw.";
    });
    const response = await chat(
      request("/api/chat", {
        ...interview,
        ...gradingSnapshot,
      }),
    );
    expect(response.status).toBe(200);
    // The response already exists, but the stream still owns its request state/lease.
    expect(
      (await resume(request("/api/interview/resume", interview))).status,
    ).toBe(409);
    finish?.();
    if (!response.body) throw new Error("Missing response stream");
    const { checkpoint: complete } = await receiveInterviewStream(
      response.body,
      () => {},
    );
    if (!complete.resumeToken) throw new Error("Missing completion checkpoint");
    expect(unsealSession(complete.resumeToken).phaseIndex).toBe(1);
    // An older browser token must not replace the newer shared progress.
    const resumed = await resume(request("/api/interview/resume", interview));
    expect(resumed.status).toBe(200);
    const checkpoint = interviewResumeResponseSchema.parse(
      await resumed.json(),
    );
    expect(unsealSession(checkpoint.resumeToken)).toMatchObject({
      phaseIndex: 1,
      timing: interview.timing,
    });
    const evidence = {
      ...interview,
      ...gradingSnapshot,
      resumeToken: checkpoint.resumeToken,
    };
    const scored = await end(request("/api/interview/end", evidence));
    expect(scored.status).toBe(200);
    const result = interviewEndResponseSchema.parse(await scored.json());
    const retried = await end(request("/api/interview/end", evidence));
    expect(retried.status).toBe(200);
    expect(
      interviewEndResponseSchema.parse(await retried.json()).scorecard,
    ).toEqual(result.scorecard);
    expect(mocks.grade).toHaveBeenCalledOnce();
    const ended = await resume(request("/api/interview/resume", interview));
    expect(interviewResumeResponseSchema.parse(await ended.json()).ended).toBe(
      true,
    );
    expect([...values.keys()].some((key) => key.endsWith(":lock"))).toBe(false);
    expect(() => interviewSessionState()).toThrow("temporarily unavailable");
  });

  it("recovers a failed grading request using the browser snapshot and rejects changed evidence", async () => {
    const interview = await started();
    mocks.grade.mockRejectedValueOnce(new Error("Provider interrupted"));
    const evidence = { ...interview, ...gradingSnapshot };
    const failed = await end(request("/api/interview/end", evidence));
    expect(failed.status).toBe(502);
    expect((await failed.json()).ended).toBe(true);
    const changed = await end(
      request("/api/interview/end", {
        ...evidence,
        messages: [{ role: "user", content: "A different design" }],
      }),
    );
    expect(changed.status).toBe(409);
    expect(mocks.grade).toHaveBeenCalledOnce();
    const retried = await end(request("/api/interview/end", evidence));
    expect(retried.status).toBe(200);
    expect(mocks.grade).toHaveBeenCalledTimes(2);
    expect(mocks.grade.mock.calls[1][2]).toEqual(gradingSnapshot);
  });
});
