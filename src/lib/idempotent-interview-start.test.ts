vi.unmock("@/lib/candidate-context");
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { withCandidateIdentity } from "@/lib/candidate-context";
import { withInterviewSessionContext } from "@/lib/interview-session-context";
import { getProblem } from "@/lib/problems";
import { idempotentInterviewStart } from "@/lib/idempotent-interview-start";
import { checkRequestLimit } from "@/lib/request-limits";
import { redisSessionCommand } from "@/lib/fixtures/redis-session-test";
const redis = vi.hoisted(() => vi.fn());
vi.mock("@/lib/redis-rest", () => ({ redisCommand: redis }));
const request = new Request("http://localhost/api/interview/start");
const problem = getProblem("url-shortener")!;
let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  redis.mockImplementation(redisSessionCommand(values));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  redis.mockReset();
});
it("coalesces concurrent local starts, preserves timing on retry and charges one quota", async () => {
  const account = crypto.randomUUID(),
    id = crypto.randomUUID();
  await withCandidateIdentity(account, async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        idempotentInterviewStart(request, problem, "mid", 45, id),
      ),
    );
    expect(new Set(results.map((r) => r.interview.sessionId)).size).toBe(1);
    expect(results.filter((r) => r.created)).toHaveLength(1);
    const again = await idempotentInterviewStart(
      request,
      problem,
      "mid",
      45,
      id,
    );
    expect(again.interview.timing).toEqual(results[0].interview.timing);
    expect(again.created).toBe(false);
    expect(await checkRequestLimit(request, "start")).toBe(0);
    expect(await checkRequestLimit(request, "start")).toBe(0);
    expect(await checkRequestLimit(request, "start")).toBeGreaterThan(0);
    await expect(
      idempotentInterviewStart(request, problem, "senior", 45, id),
    ).rejects.toThrow("different interview selection");
  });
  const other = await withCandidateIdentity(crypto.randomUUID(), () =>
    idempotentInterviewStart(request, problem, "mid", 45, id),
  );
  expect(other.created).toBe(true);
});
it("publishes shared response, transcript and quota atomically, with owner-scoped replays", async () => {
  vi.stubEnv("INTELIPREP_ENV", "beta");
  vi.stubEnv("INTERVIEW_RESUME_SECRET", "s".repeat(32));
  const id = crypto.randomUUID(),
    account = crypto.randomUUID();
  const start = () =>
    withCandidateIdentity(account, () =>
      withInterviewSessionContext(() =>
        idempotentInterviewStart(request, problem, "mid", 45, id),
      ),
    );
  const result = await Promise.all([start(), start(), start()]);
  expect(result.filter((r) => r.created)).toHaveLength(1);
  expect(new Set(result.map((r) => r.interview.sessionId)).size).toBe(1);
  const session = JSON.parse(
    [...values.entries()].find(([k]) =>
      k.endsWith(`:session:${result[0].interview.sessionId}`),
    )![1],
  );
  expect(session.transcript.messages).toHaveLength(1);
  expect(session.checkpoint.timing).toEqual(result[0].interview.timing);
  const counters = [...values.entries()].filter(([key]) =>
    key.includes(":limit:start:"),
  );
  expect(counters).toHaveLength(3);
  expect(counters.every(([, v]) => v === "1")).toBe(true);
  expect((await start()).interview.timing).toEqual(result[0].interview.timing);
  await withCandidateIdentity(account, () =>
    withInterviewSessionContext(async () => {
      await expect(
        idempotentInterviewStart(request, problem, "senior", 45, id),
      ).rejects.toThrow("different interview selection");
    }),
  );
});
it("returns the shared quota delay without publishing a provisional interview", async () => {
  vi.stubEnv("INTELIPREP_ENV", "beta");
  vi.stubEnv("INTERVIEW_RESUME_SECRET", "s".repeat(32));
  redis.mockResolvedValueOnce(null).mockResolvedValueOnce(["limited", "1900"]);
  await withCandidateIdentity(crypto.randomUUID(), () =>
    withInterviewSessionContext(async () => {
      await expect(
        idempotentInterviewStart(request, problem, "mid", 45),
      ).rejects.toMatchObject({ retryAfter: 2 });
    }),
  );
  expect(values.size).toBe(0);
});
