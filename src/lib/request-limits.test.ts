// These cases exercise the anonymous monitoring/IP boundary.
vi.unmock("@/lib/candidate-context");
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkRequestLimit, requestIdentity } from "@/lib/request-limits";
import { withCandidateIdentity } from "@/lib/candidate-context";

const redis = vi.hoisted(() => vi.fn());
vi.mock("@/lib/redis-rest", () => ({ redisCommand: redis }));
const request = new Request("http://localhost/api/chat");
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  redis.mockReset();
});
describe("request limits", () => {
  it("gives accounts separate quotas even on a shared IP, while keeping the model ceiling global", async () => {
    const a = withCandidateIdentity("alice", () => requestIdentity(request));
    const b = withCandidateIdentity("bob", () => requestIdentity(request));
    expect(a).not.toBe(b);
    expect(a).not.toContain("alice");
    await withCandidateIdentity("alice", async () => {
      for (let i = 0; i < 10; i++)
        expect(await checkRequestLimit(request, "start")).toBe(0);
      expect(await checkRequestLimit(request, "start")).toBeGreaterThan(0);
    });
    expect(
      await withCandidateIdentity("bob", () =>
        checkRequestLimit(request, "start"),
      ),
    ).toBe(0);
  });
  it("bounds bursts and resets after the minute window", async () => {
    vi.useFakeTimers();
    for (let i = 0; i < 30; i++)
      expect(await checkRequestLimit(request, "chat")).toBe(0);
    expect(await checkRequestLimit(request, "chat")).toBe(60);
    vi.advanceTimersByTime(60_000);
    expect(await checkRequestLimit(request, "chat")).toBe(0);
  });
  it("applies the hourly cap even across separate minute windows", async () => {
    vi.useFakeTimers();
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 10; j++)
        expect(await checkRequestLimit(request, "start")).toBe(0);
      vi.advanceTimersByTime(60_000);
    }
    expect(await checkRequestLimit(request, "start")).toBe(3_240);
  });
  it("ignores spoofed forwarded headers outside Vercel", () => {
    expect(
      requestIdentity(
        new Request(request.url, {
          headers: {
            "x-forwarded-for": "1.2.3.4",
            "x-vercel-forwarded-for": "5.6.7.8",
          },
        }),
      ),
    ).toBe("local");
  });
  it("requires a valid platform IP and hashes it", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("INTERVIEW_RESUME_SECRET", "s".repeat(32));
    expect(() => requestIdentity(request)).toThrow();
    expect(() =>
      requestIdentity(
        new Request(request.url, {
          headers: { "x-vercel-forwarded-for": "arbitrary" },
        }),
      ),
    ).toThrow();
    expect(
      requestIdentity(
        new Request(request.url, {
          headers: { "x-vercel-forwarded-for": "1.2.3.4" },
        }),
      ),
    ).toMatch(/^[a-f0-9]{64}$/);
  });
  it("uses one atomic shared check for client quotas and the model ceiling", async () => {
    vi.stubEnv("INTELIPREP_ENV", "beta");
    redis.mockResolvedValue(1_501);
    expect(await checkRequestLimit(request, "chat")).toBe(2);
    const args = redis.mock.calls[0][0];
    expect(args[0]).toBe("EVAL");
    expect(args[2]).toBe(3);
    expect(args).toContain("inteliprep:v1:beta:limit:model:hour");
  });
  it("fails closed if the shared store fails or returns malformed data", async () => {
    vi.stubEnv("INTELIPREP_ENV", "beta");
    redis.mockResolvedValue("0");
    await expect(checkRequestLimit(request, "end")).rejects.toThrow();
    redis.mockRejectedValue(new Error("Unavailable"));
    await expect(checkRequestLimit(request, "end")).rejects.toThrow();
  });
});
