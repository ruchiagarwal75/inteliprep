import { beforeEach, expect, it, vi } from "vitest";
import { setBetaInvite } from "@/lib/admin-invites";
const harness = vi.hoisted(() => ({
  admin: vi.fn(),
  write: vi.fn(),
  deliver: vi.fn(),
}));
vi.mock("@/lib/admin-auth", () => ({ requireAdminIdentity: harness.admin }));
vi.mock("@/lib/beta-invite-write", () => ({ writeBetaInvite: harness.write }));
vi.mock("@/lib/approval-email-delivery", () => ({
  deliverApprovalEmail: harness.deliver,
}));
beforeEach(() => {
  vi.resetAllMocks();
  harness.admin.mockResolvedValue("owner-id");
});

it("requires owner verification before any database change or email", async () => {
  harness.admin.mockRejectedValue(Error("denied"));
  await expect(
    setBetaInvite({ email: "person@example.test", approved: true }),
  ).rejects.toThrow("denied");
  expect(harness.write).not.toHaveBeenCalled();
  expect(harness.deliver).not.toHaveBeenCalled();
});
it("sends only the newly queued notification after the approval transaction commits", async () => {
  harness.write.mockResolvedValue({
    invite: { approved: true },
    notificationId: "queued-id",
  });
  harness.deliver.mockResolvedValue({ status: "failed" });
  await expect(
    setBetaInvite({ email: " PERSON@example.test ", approved: true }),
  ).resolves.toMatchObject({
    invite: { approved: true },
    notification: { status: "failed" },
  });
  expect(harness.write).toHaveBeenCalledWith(
    "person@example.test",
    true,
    "owner-id",
  );
  expect(harness.deliver).toHaveBeenCalledWith("queued-id");
});
it.each([true, false])(
  "does not send for an unchanged approval or revocation (%s)",
  async (approved) => {
    harness.write.mockResolvedValue({
      invite: { approved },
      notificationId: undefined,
    });
    await setBetaInvite({ email: "person@example.test", approved });
    expect(harness.deliver).not.toHaveBeenCalled();
  },
);
it("rejects injected notification or recipient fields", async () => {
  await expect(
    setBetaInvite({
      email: "person@example.test",
      approved: true,
      notificationId: "injected",
    }),
  ).rejects.toThrow();
  expect(harness.write).not.toHaveBeenCalled();
});
