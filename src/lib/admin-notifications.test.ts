import { beforeEach, expect, it, vi } from "vitest";
const h = vi.hoisted(() => ({
  admin: vi.fn(),
  sql: vi.fn(),
  deliver: vi.fn(),
}));
vi.mock("@/lib/admin-auth", () => ({ requireAdminIdentity: h.admin }));
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => h.sql }));
vi.mock("@/lib/notifications", () => ({ deliverNotification: h.deliver }));
import {
  adminNotifications,
  retryAdminNotification,
} from "./admin-notifications";
beforeEach(() => {
  vi.resetAllMocks();
});
it("revalidates the owner before reading or retrying any email", async () => {
  h.admin.mockRejectedValue(Error("restricted"));
  await expect(adminNotifications()).rejects.toThrow("restricted");
  await expect(retryAdminNotification("id")).rejects.toThrow("restricted");
  expect(h.sql).not.toHaveBeenCalled();
  expect(h.deliver).not.toHaveBeenCalled();
});
it("keeps provider bodies out of the read model and exposes safe retry state", async () => {
  h.admin.mockResolvedValue("owner");
  h.sql.mockResolvedValue([
    {
      id: "id",
      kind: "welcome",
      recipient: "qa@example.test",
      createdAt: new Date().toISOString(),
      status: "failed",
      claimedAt: null,
      firstAttemptAt: null,
      referenceId: "ref",
      failureCategory: "configuration",
      body: "private",
    },
  ]);
  const rows = await adminNotifications();
  expect(rows[0]).toMatchObject({
    canRetry: true,
    status: "failed",
    kind: "welcome",
  });
  expect(rows[0]).not.toHaveProperty("body");
  await retryAdminNotification("id");
  expect(h.deliver).toHaveBeenCalledWith("id");
});
