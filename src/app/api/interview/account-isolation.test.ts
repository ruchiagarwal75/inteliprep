import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { POST as start } from "@/app/api/interview/start/route";
import { POST as resume } from "@/app/api/interview/resume/route";
import { POST as chat } from "@/app/api/chat/route";
import { POST as end } from "@/app/api/interview/end/route";
import { requireCandidateIdentity } from "@/lib/candidate-auth";
import { CandidateAuthError } from "@/lib/supabase-config";
import { redisSessionCommand } from "@/lib/fixtures/redis-session-test";
import { sealSession, unsealSession } from "@/lib/session-token";
import { interviewStartSchema } from "@/lib/interview-selection";

const redis = vi.hoisted(() => vi.fn());
vi.mock("@/lib/redis-rest", () => ({ redisCommand: redis }));
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const values = new Map<string, string>();
const selection = { problemId: "single-server-scaling", level: "mid" };
const request = (body: unknown, expectedAccount?: string) =>
  new Request("http://localhost/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(expectedAccount ? { "X-Interview-Account": expectedAccount } : {}),
    },
    body: JSON.stringify(body),
  });
async function started() {
  const response = await start(request(selection));
  expect(response.status).toBe(200);
  return interviewStartSchema.parse(await response.json());
}
beforeEach(() => {
  vi.stubEnv("INTELIPREP_ENV", "beta");
  vi.stubEnv("OPENAI_KEY", "test-not-used");
  vi.stubEnv("INTERVIEW_RESUME_SECRET", "s".repeat(32));
  vi.stubEnv("KV_REST_API_URL", "https://example.upstash.io");
  vi.stubEnv("KV_REST_API_TOKEN", "fixture");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  values.clear();
  redis.mockReset().mockImplementation(redisSessionCommand(values));
});
afterEach(() => {
  vi.unstubAllEnvs();
});
describe("authenticated interview boundary", () => {
  it("blocks all interview mutations while logged out, before Redis or model work", async () => {
    vi.mocked(requireCandidateIdentity).mockRejectedValue(
      new CandidateAuthError(),
    );
    for (const handler of [start, resume, chat, end])
      expect((await handler(request({}))).status).toBe(401);
    expect(redis).not.toHaveBeenCalled();
  });
  it("never accepts an expected account header as the authenticated identity", async () => {
    vi.mocked(requireCandidateIdentity).mockResolvedValue(bob);
    expect((await start(request(selection, alice))).status).toBe(403);
    expect(redis).not.toHaveBeenCalled();
  });
  it("binds Redis progress and tokens to the owner and rejects another account's copied token", async () => {
    const interview = await started();
    expect(unsealSession(interview.resumeToken ?? "")).toMatchObject({
      ownerUserId: alice,
    });
    expect([...values.values()].some((value) => value.includes(alice))).toBe(
      true,
    );
    vi.mocked(requireCandidateIdentity).mockResolvedValue(bob);
    const body = {
      ...selection,
      sessionId: interview.sessionId,
      resumeToken: interview.resumeToken,
      messages: [interview.openingMessage],
    };
    for (const handler of [resume, chat, end])
      expect((await handler(request(body))).status).toBe(404);
    vi.mocked(requireCandidateIdentity).mockResolvedValue(alice);
    expect((await resume(request(body))).status).toBe(200);
  });
  it("keeps ownership when restoring from a token after Redis expires", async () => {
    const interview = await started();
    values.clear();
    vi.mocked(requireCandidateIdentity).mockResolvedValue(bob);
    expect((await resume(request(interview))).status).toBe(404);
    expect(values.size).toBe(0);
    vi.mocked(requireCandidateIdentity).mockResolvedValue(alice);
    expect((await resume(request(interview))).status).toBe(200);
    expect([...values.values()][0]).toContain(alice);
  });
  it("does not automatically claim valid but anonymous legacy checkpoints", async () => {
    const interview = await started();
    values.clear();
    const checkpoint = unsealSession(interview.resumeToken ?? "");
    delete checkpoint.ownerUserId;
    const response = await resume(
      request({ ...interview, resumeToken: sealSession(checkpoint) }),
    );
    expect(response.status).toBe(404);
    expect(values.size).toBe(0);
  });
  it("checks ownership before returning a cached scorecard", async () => {
    const interview = await started();
    const body = {
      ...selection,
      sessionId: interview.sessionId,
      resumeToken: interview.resumeToken,
      messages: [interview.openingMessage],
    };
    const result = await end(request(body));
    expect(result.status).toBe(200);
    const scored = await result.json();
    vi.mocked(requireCandidateIdentity).mockResolvedValue(bob);
    expect(
      (await end(request({ ...body, resumeToken: scored.resumeToken }))).status,
    ).toBe(404);
    vi.mocked(requireCandidateIdentity).mockResolvedValue(alice);
    expect(
      (await end(request({ ...body, resumeToken: scored.resumeToken }))).status,
    ).toBe(200);
  });
});
