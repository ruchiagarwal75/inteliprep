import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/invites/email/route";
import { AdminAccessError } from "@/lib/admin-auth";
const harness = vi.hoisted(() => ({ admin: vi.fn(), deliver: vi.fn() }));
vi.mock("@/lib/admin-auth", async (original) => ({
  ...(await original<typeof import("@/lib/admin-auth")>()),
  requireAdminIdentity: harness.admin,
}));
vi.mock("@/lib/approval-email-delivery", () => ({
  deliverApprovalEmail: harness.deliver,
}));
const id = "11111111-1111-4111-8111-111111111111";
const request = (body: unknown, origin = "https://mockmeai.com") =>
  new Request("https://mockmeai.com/api/admin/invites/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
  harness.admin.mockResolvedValue("owner");
  harness.deliver.mockResolvedValue({ id, status: "sent", canRetry: false });
});
it.each([401, 403] as const)(
  "denies non-owner access with %s",
  async (status) => {
    harness.admin.mockRejectedValue(new AdminAccessError(status));
    expect((await POST(request({ notificationId: id }))).status).toBe(status);
    expect(harness.deliver).not.toHaveBeenCalled();
  },
);
it("rejects cross-origin sends before delivery", async () => {
  expect(
    (await POST(request({ notificationId: id }, "https://attacker.example")))
      .status,
  ).toBe(403);
  expect(harness.deliver).not.toHaveBeenCalled();
});
it("accepts only an existing notification ID, never arbitrary recipients or content", async () => {
  expect(
    (await POST(request({ notificationId: id, to: "other@example.test" })))
      .status,
  ).toBe(400);
  expect((await POST(request({ notificationId: "invalid" }))).status).toBe(400);
  expect(harness.deliver).not.toHaveBeenCalled();
  const response = await POST(request({ notificationId: id }));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(harness.deliver).toHaveBeenCalledWith(id);
});
