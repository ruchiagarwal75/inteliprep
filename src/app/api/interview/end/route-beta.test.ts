import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createInterviewSession,
  interviewSessionCheckpoint,
} from "@/lib/interview-sessions";
import {
  gradingSelection,
  scorecardFixture,
} from "@/lib/fixtures/scorecard-test";
import { unsealSession } from "@/lib/session-token";
import { BetaUnavailableError } from "@/lib/beta-config";
import { POST } from "@/app/api/interview/end/route";

const mocks = vi.hoisted(() => ({
  persist: vi.fn(),
  release: vi.fn(),
  grade: vi.fn(),
}));
vi.mock("@/lib/shared-interview-session", () => ({
  openSharedSession: async () => mocks,
}));
vi.mock("@/lib/redis-rest", () => ({ redisCommand: async () => 0 }));
vi.mock("@/lib/interview-grading", () => ({ gradeInterview: mocks.grade }));
beforeEach(() => {
  vi.stubEnv("INTELIPREP_ENV", "beta");
  vi.stubEnv("OPENAI_KEY", "test-key");
  vi.stubEnv("INTERVIEW_RESUME_SECRET", "s".repeat(32));
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
  mocks.persist.mockReset().mockResolvedValue(undefined);
  mocks.release.mockReset().mockResolvedValue(undefined);
  mocks.grade.mockReset().mockResolvedValue(scorecardFixture());
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
function post() {
  const sessionId = createInterviewSession(gradingSelection);
  const resumeToken = interviewSessionCheckpoint(
    sessionId,
    gradingSelection,
  ).resumeToken;
  return POST(
    new Request("http://localhost/api/interview/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...gradingSelection,
        sessionId,
        resumeToken,
        messages: [
          {
            role: "assistant",
            content: "What requirements would you clarify?",
          },
        ],
      }),
    }),
  );
}
describe("beta grading persistence boundary", () => {
  it("publishes the evidence freeze before calling the grader, then publishes feedback", async () => {
    const order: string[] = [];
    mocks.persist.mockImplementation(async () => {
      order.push("persist");
    });
    mocks.grade.mockImplementation(async () => {
      order.push("grade");
      return scorecardFixture();
    });
    const response = await post();
    expect(response.status).toBe(200);
    expect(order).toEqual(["persist", "grade", "persist"]);
    expect(mocks.release).toHaveBeenCalledOnce();
  });
  it("makes no grading call when the freeze cannot be published and returns a frozen checkpoint", async () => {
    mocks.persist.mockRejectedValueOnce(new BetaUnavailableError());
    const response = await post();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.ended).toBe(true);
    expect(unsealSession(body.resumeToken).ending).toBeDefined();
    expect(mocks.grade).not.toHaveBeenCalled();
    expect(mocks.release).toHaveBeenCalledOnce();
  });
  it("retains the durable end checkpoint after grading fails", async () => {
    mocks.grade.mockRejectedValue(new Error("private provider data"));
    const response = await post();
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.ended).toBe(true);
    expect(body.error).not.toContain("private");
    expect(unsealSession(body.resumeToken).ending).toBeDefined();
    expect(mocks.persist).toHaveBeenCalledOnce();
    expect(mocks.release).toHaveBeenCalledOnce();
  });
});
