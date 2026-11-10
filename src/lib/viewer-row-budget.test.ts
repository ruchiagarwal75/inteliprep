import { afterEach, expect, it, vi } from "vitest";
const redis = vi.hoisted(() => vi.fn());
vi.mock("@/lib/redis-rest", () => ({ redisCommand: redis }));
import {
  reserveViewerRow,
  NEW_VIEWER_ROWS_PER_DAY,
} from "@/lib/viewer-row-budget";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  redis.mockReset();
});
it("allows 2000 unique identifiers, retains retries, then stops new rows until the next day", async () => {
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("INTELIPREP_ENV", "");
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2030-01-01T12:00:00Z"));
  for (let i = 0; i < NEW_VIEWER_ROWS_PER_DAY; i++)
    expect(await reserveViewerRow("browser", String(i))).toBe(true);
  expect(await reserveViewerRow("browser", "0")).toBe(true);
  expect(await reserveViewerRow("browser", "overflow")).toBe(false);
  expect(await reserveViewerRow("ip", "separate-hash")).toBe(true);
  vi.advanceTimersByTime(86400000);
  expect(await reserveViewerRow("browser", "overflow")).toBe(true);
});
it("uses one atomic shared reservation and rejects invalid Redis replies", async () => {
  vi.stubEnv("INTELIPREP_ENV", "beta");
  redis
    .mockResolvedValueOnce(0)
    .mockResolvedValueOnce(1)
    .mockResolvedValueOnce("1");
  expect(await reserveViewerRow("browser", "hash")).toBe(false);
  expect(await reserveViewerRow("browser", "hash")).toBe(true);
  expect(redis.mock.calls[0][0][0]).toBe("EVAL");
  expect(redis.mock.calls[0][0]).toContain(2000);
  await expect(reserveViewerRow("browser", "hash")).rejects.toThrow();
});
