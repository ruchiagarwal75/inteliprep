import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ipVisitorMetrics, recordIpVisitor } from "@/lib/ip-visitor-tracking";
const harness = vi.hoisted(() => ({ query: vi.fn(), log: vi.fn() }));
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => harness.query }));
vi.mock("@/lib/server-events", () => ({ logServerEvent: harness.log }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VISITOR_IP_HASH_SECRET", "fixture-ip-key-".repeat(3));
});
afterEach(() => vi.unstubAllEnvs());
it("distinguishes no recorded visits from missing configuration or a database failure", async () => {
  harness.query.mockResolvedValueOnce([
    { total: 0, last7Days: 0, firstRecordedAt: null },
  ]);
  expect(await ipVisitorMetrics(false)).toEqual({
    status: "ready",
    total: 0,
    last7Days: 0,
    firstRecordedAt: null,
  });
  harness.query.mockRejectedValueOnce(Error("private database diagnostic"));
  expect(await ipVisitorMetrics(false)).toEqual({ status: "unavailable" });
  expect(JSON.stringify(harness.log.mock.calls)).not.toContain(
    "private database diagnostic",
  );
  vi.stubEnv("VISITOR_IP_HASH_SECRET", "");
  harness.query.mockClear();
  expect(await ipVisitorMetrics(false)).toEqual({ status: "unavailable" });
  expect(harness.query).not.toHaveBeenCalled();
});
it("requires a stable hash even when persisting a raw address", async () => {
  await expect(
    recordIpVisitor(
      { hash: "192.0.2.1", rawIp: "192.0.2.1", countryCode: "US" },
      false,
    ),
  ).rejects.toThrow("Invalid IP comparison identifier");
  expect(harness.query).not.toHaveBeenCalled();
});
