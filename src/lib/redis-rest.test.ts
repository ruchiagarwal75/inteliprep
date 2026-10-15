import { afterEach, describe, expect, it, vi } from "vitest";
import { redisCommand } from "@/lib/redis-rest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("Redis REST", () => {
  it("uses the URL and write token provisioned by the Vercel integration", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("KV_REST_API_URL", "https://native.example");
    vi.stubEnv("KV_REST_API_TOKEN", "native-test-token");
    const fetch = vi.fn().mockResolvedValue(Response.json({ result: "PONG" }));
    vi.stubGlobal("fetch", fetch);
    expect(await redisCommand(["PING"])).toBe("PONG");
    expect(fetch.mock.calls[0][0]).toBe("https://native.example");
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer native-test-token",
    );
  });
  it("sends one authenticated command without mutation retries", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "secret");
    const fetch = vi.fn().mockResolvedValue(Response.json({ result: "OK" }));
    vi.stubGlobal("fetch", fetch);
    expect(await redisCommand(["SET", "key", "value", "NX", "EX", 10])).toBe(
      "OK",
    );
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][1]).toMatchObject({
      body: '["SET","key","value","NX","EX",10]',
      cache: "no-store",
    });
  });
  it.each([
    Response.json({ error: "private provider detail" }),
    new Response("secret", { status: 503 }),
    Response.json({ unrelated: true }),
  ])("does not expose provider failures", async (response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    await expect(redisCommand(["PING"])).rejects.toThrow(
      "temporarily unavailable",
    );
  });
});
