import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/route";
import { POST as start } from "@/app/api/interview/start/route";
import { POST as resume } from "@/app/api/interview/resume/route";
import { interviewStartSchema } from "@/lib/interview-selection";
import { interviewResumeResponseSchema } from "@/lib/interview-resume";
import { interviewSessionState } from "@/lib/interview-session-context";
import { unsealSession } from "@/lib/session-token";
import { gradingSelection } from "@/lib/fixtures/scorecard-test";
import { redisSessionCommand } from "@/lib/fixtures/redis-session-test";

const mocks = vi.hoisted(() => ({ redis: vi.fn(), reply: vi.fn() }));
vi.mock("@/lib/redis-rest", () => ({ redisCommand: mocks.redis }));
vi.mock("@/lib/llm", () => ({
  hasApiKey: () => true,
  streamInterviewerReply: mocks.reply,
}));
vi.mock("@/lib/phase-assessment", () => ({
  assessPhaseCoverage: async () => [],
}));
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
      if (!String(args[1]).includes("INCR"))
        scopes.add(interviewSessionState());
      return command(args);
    });
  mocks.reply.mockReset();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  for (const scope of scopes) expect(scope.size).toBe(0);
});
const request = (body: unknown) =>
  new Request("https://beta.example/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-vercel-forwarded-for": "203.0.113.1",
    },
    body: JSON.stringify(body),
  });
async function started() {
  return interviewStartSchema.parse(
    await (await start(request(gradingSelection))).json(),
  );
}

describe("beta stream failure cleanup", () => {
  it("discards a cancelled request's working copy and lets a new request restore unchanged progress", async () => {
    const interview = await started();
    let finish: (() => void) | undefined;
    mocks.reply.mockImplementation(async function* () {
      yield "Take your time.";
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      yield "I am listening.";
    });
    const response = await POST(
      request({
        ...interview,
        messages: [
          interview.openingMessage,
          { role: "user", content: "I am drawing", action: "draw" },
        ],
      }),
    );
    expect(response.status).toBe(200);
    if (!response.body) throw new Error("Missing response stream");
    const reader = response.body.getReader();
    await reader.read();
    await reader.cancel();
    for (const scope of scopes) expect(scope.size).toBe(0);
    const resumed = await resume(request(interview));
    expect(resumed.status).toBe(200);
    const checkpoint = interviewResumeResponseSchema.parse(
      await resumed.json(),
    );
    expect(unsealSession(checkpoint.resumeToken).phaseIndex).toBe(0);
    // Finishing an older cancelled stream must not affect the replacement request.
    finish?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect([...values.keys()].some((key) => key.endsWith(":lock"))).toBe(false);
  });

  it("rejects a Redis read failure before model work without using a local cache", async () => {
    const interview = await started();
    const command = redisSessionCommand(values);
    mocks.redis.mockImplementation(async (args: (string | number)[]) => {
      if (args[0] === "GET") throw new Error("Redis unavailable");
      return command(args);
    });
    const response = await POST(
      request({
        ...interview,
        messages: [interview.openingMessage],
      }),
    );
    expect(response.status).toBe(503);
    expect(mocks.reply).not.toHaveBeenCalled();
    expect([...values.keys()].some((key) => key.endsWith(":lock"))).toBe(false);
  });
});
