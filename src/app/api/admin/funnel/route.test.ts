import { afterEach, expect, it, vi } from "vitest";
import { GET } from "@/app/api/admin/funnel/route";
import { AdminAccessError } from "@/lib/admin-auth";
const { verify, list } = vi.hoisted(() => ({ verify: vi.fn(), list: vi.fn() }));
vi.mock("@/lib/admin-auth", async (original) => ({
  ...(await original<typeof import("@/lib/admin-auth")>()),
  requireAdminIdentity: verify,
}));
vi.mock("@/lib/admin-beta-funnel", () => ({ adminBetaFunnel: list }));
afterEach(() => vi.resetAllMocks());
it.each([401, 403] as const)(
  "denies non-admin requests (%s)",
  async (status) => {
    verify.mockRejectedValue(new AdminAccessError(status));
    expect(
      (await GET(new Request("https://mockmeai.test/api/admin/funnel"))).status,
    ).toBe(status);
    expect(list).not.toHaveBeenCalled();
  },
);
it("validates date ranges before data access", async () => {
  verify.mockResolvedValue("owner");
  expect(
    (
      await GET(
        new Request(
          "https://mockmeai.test/api/admin/funnel?from=2026-11-09&to=2026-11-01",
        ),
      )
    ).status,
  ).toBe(400);
  expect(list).not.toHaveBeenCalled();
});
