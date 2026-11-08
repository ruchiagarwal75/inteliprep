import { afterEach, expect, it, vi } from "vitest";
import { GET } from "@/app/api/admin/overview/route";
import { AdminAccessError } from "@/lib/admin-auth";
const { verify, overview } = vi.hoisted(() => ({
  verify: vi.fn(),
  overview: vi.fn(),
}));
vi.mock("@/lib/admin-auth", async (original) => ({
  ...(await original<typeof import("@/lib/admin-auth")>()),
  requireAdminIdentity: verify,
}));
vi.mock("@/lib/admin-overview", () => ({ adminOverview: overview }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});
it("logs a scrubbed code location for an authenticated preview probe", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  verify.mockResolvedValue("owner");
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const response = await GET(
    new Request("https://preview.example/api/admin/overview?diagnostic=throw"),
  );
  expect(response.status).toBe(503);
  expect(overview).not.toHaveBeenCalled();
  const event = JSON.parse(log.mock.calls[0][0]);
  expect(event.errorFrames).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        file: "src/app/api/admin/overview/route.ts",
        line: expect.any(Number),
      }),
    ]),
  );
  expect(JSON.stringify(event)).not.toContain("Preview diagnostic probe");
  expect(await response.text()).not.toContain("errorFrames");
});
it("ignores the probe in Production and denies another account before diagnostic code", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  verify.mockResolvedValue("owner");
  overview.mockResolvedValue({ available: true });
  const request = new Request(
    "https://app.example/api/admin/overview?diagnostic=throw",
  );
  expect((await GET(request)).status).toBe(200);
  expect(overview).toHaveBeenCalledOnce();
  vi.stubEnv("VERCEL_ENV", "preview");
  verify.mockRejectedValue(new AdminAccessError(403));
  expect((await GET(request)).status).toBe(403);
  expect(overview).toHaveBeenCalledOnce();
});
