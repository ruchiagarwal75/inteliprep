import { expect, it, vi } from "vitest";
import { adminBetaFunnel } from "@/lib/admin-beta-funnel";
import { betaFunnelQuery } from "@/lib/beta-funnel-query";
const { verify, db } = vi.hoisted(() => ({ verify: vi.fn(), db: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdminIdentity: verify }));
vi.mock("@/lib/reporting-db", () => ({ reportingDb: db }));
it("re-checks admin identity inside the data function before opening the database", async () => {
  verify.mockRejectedValue(new Error("denied"));
  await expect(
    adminBetaFunnel(betaFunnelQuery(new URLSearchParams())),
  ).rejects.toThrow("denied");
  expect(db).not.toHaveBeenCalled();
});
