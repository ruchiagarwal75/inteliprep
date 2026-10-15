import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";

const redis = vi.hoisted(() => vi.fn());
vi.mock("@/lib/redis-rest", () => ({ redisCommand: redis }));
afterEach(() => {
  vi.unstubAllEnvs();
  redis.mockReset();
});
describe("readiness health", () => {
  it("works locally without a cloud store and makes no model call", async () => {
    vi.stubEnv("OPENAI_KEY", "key");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok" });
    expect(redis).not.toHaveBeenCalled();
  });
  it("reports missing configuration without exposing any values", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("OPENAI_KEY", "secret-model-key");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "secret-redis-key");
    vi.stubEnv("INTERVIEW_RESUME_SECRET", "");
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret");
    expect(redis).not.toHaveBeenCalled();
  });
  it("requires a working store in beta", async () => {
    vi.stubEnv("INTELIPREP_ENV", "beta");
    vi.stubEnv("OPENAI_KEY", "key");
    vi.stubEnv("INTERVIEW_RESUME_SECRET", "s".repeat(32));
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    redis.mockResolvedValue("PONG");
    expect((await GET()).status).toBe(200);
    redis.mockRejectedValue(new Error("Unavailable"));
    expect((await GET()).status).toBe(503);
  });
});
