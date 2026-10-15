import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { redisConnection } from "@/lib/redis-config";

beforeEach(() => {
  for (const name of [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "KV_REST_API_URL",
    "KV_REST_API_TOKEN",
  ])
    vi.stubEnv(name, "");
});
afterEach(() => vi.unstubAllEnvs());

describe("Redis integration credentials", () => {
  it("uses the native Vercel integration without copying secrets", () => {
    vi.stubEnv("KV_REST_API_URL", "https://native.example");
    vi.stubEnv("KV_REST_API_TOKEN", "native-test-token");
    expect(redisConnection()).toEqual({
      urlKey: "KV_REST_API_URL",
      tokenKey: "KV_REST_API_TOKEN",
      url: "https://native.example",
      token: "native-test-token",
    });
  });
  it("gives the explicit Upstash family precedence", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://direct.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "direct-test-token");
    vi.stubEnv("KV_REST_API_URL", "https://native.example");
    vi.stubEnv("KV_REST_API_TOKEN", "native-test-token");
    expect(redisConnection()).toMatchObject({
      url: "https://direct.example",
      token: "direct-test-token",
    });
  });
  it("does not borrow a token from another credential family", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://direct.example");
    vi.stubEnv("KV_REST_API_URL", "https://native.example");
    vi.stubEnv("KV_REST_API_TOKEN", "native-test-token");
    expect(redisConnection()).toMatchObject({
      urlKey: "UPSTASH_REDIS_REST_URL",
      tokenKey: "UPSTASH_REDIS_REST_TOKEN",
      token: "",
    });
  });
  it("reports the expected keys even before any Redis setup", () => {
    expect(redisConnection()).toMatchObject({
      urlKey: "UPSTASH_REDIS_REST_URL",
      tokenKey: "UPSTASH_REDIS_REST_TOKEN",
    });
  });
});
