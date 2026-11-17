import { afterEach, beforeEach, expect, it, vi } from "vitest";
const harness = vi.hoisted(() => ({ purge: vi.fn(), log: vi.fn() }));
vi.mock("@/lib/ip-visitor-tracking", () => ({
  purgeExpiredVisitorIps: harness.purge,
}));
vi.mock("@/lib/server-events", () => ({ logServerEvent: harness.log }));
import { GET } from "./route";
const secret = "test-only-retention-secret-".repeat(2);
const request = (authorization?: string) =>
  new Request("https://example.invalid/api/cron/visitor-ip-retention", {
    headers: authorization ? { authorization } : {},
  });
beforeEach(() => {
  vi.stubEnv("CRON_SECRET", secret);
  harness.purge.mockResolvedValue(2);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
it("fails closed for missing configuration and rejects forged cron requests", async () => {
  for (const authorization of [
    undefined,
    "Bearer wrong",
    `Bearer ${"x".repeat(secret.length)}`,
  ])
    expect((await GET(request(authorization))).status).toBe(401);
  vi.stubEnv("CRON_SECRET", "");
  expect((await GET(request())).status).toBe(503);
  expect(harness.purge).not.toHaveBeenCalled();
});
it("runs the cleanup for the scheduler and returns counts only", async () => {
  const response = await GET(request(`Bearer ${secret}`));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ cleared: 2 });
  expect(harness.purge).toHaveBeenCalledOnce();
});
it("does not return database diagnostics on failure", async () => {
  harness.purge.mockRejectedValueOnce(Error("private address 192.0.2.7"));
  const response = await GET(request(`Bearer ${secret}`));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("192.0.2.7");
  expect(harness.log).toHaveBeenCalledOnce();
});
