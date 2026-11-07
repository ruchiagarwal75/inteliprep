import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/reporting-db", () => ({ reportingConfigured: () => true }));
afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});
it("keeps telemetry failures from failing interviews and backs off after a database outage", async () => {
  const { safeReporting } = await import("@/lib/reporting-write");
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const bad = vi.fn(async () => {
    throw new Error("secret or full interview answer");
  });
  await expect(safeReporting(bad)).resolves.toBeUndefined();
  const next = vi.fn();
  await safeReporting(next);
  expect(next).not.toHaveBeenCalled();
  expect(JSON.stringify(log.mock.calls)).not.toMatch(/secret|answer/);
});
