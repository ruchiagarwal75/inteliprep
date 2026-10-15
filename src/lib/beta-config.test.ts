import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertBetaReady,
  isPrivateBeta,
  missingBetaSettings,
  redisNamespace,
} from "@/lib/beta-config";

afterEach(() => vi.unstubAllEnvs());
describe("beta configuration", () => {
  it("validates native Vercel Redis variables and reports their missing names", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("OPENAI_KEY", "test-key");
    vi.stubEnv("INTERVIEW_RESUME_SECRET", "s".repeat(32));
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("KV_REST_API_URL", "https://native.example");
    vi.stubEnv("KV_REST_API_TOKEN", "native-test-token");
    expect(missingBetaSettings()).toEqual([]);
    vi.stubEnv("KV_REST_API_TOKEN", "");
    expect(missingBetaSettings()).toEqual(["KV_REST_API_TOKEN"]);
  });
  it("keeps the private beta unavailable on a production domain", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(missingBetaSettings()).toContain("PRIVATE_BETA_REQUIRES_PREVIEW");
    expect(() => assertBetaReady()).toThrow("temporarily unavailable");
  });
  it("keeps local builds usable without deployment credentials", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("INTELIPREP_ENV", "");
    expect(isPrivateBeta()).toBe(false);
    expect(() => assertBetaReady()).not.toThrow();
  });
  it("fails closed in Vercel and reports names only", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("OPENAI_KEY", "");
    vi.stubEnv("INTERVIEW_RESUME_SECRET", "short");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "http://insecure.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    expect(missingBetaSettings()).toEqual([
      "OPENAI_KEY",
      "INTERVIEW_RESUME_SECRET",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
    ]);
    expect(() => assertBetaReady()).toThrow("temporarily unavailable");
  });
  it("accepts valid settings and separates preview counters from production", () => {
    vi.stubEnv("INTELIPREP_ENV", "beta");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("OPENAI_KEY", "test-key");
    vi.stubEnv("INTERVIEW_RESUME_SECRET", "s".repeat(32));
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    expect(missingBetaSettings()).toEqual([]);
    expect(() => assertBetaReady()).not.toThrow();
    expect(redisNamespace()).toBe("inteliprep:v1:preview");
  });
});
