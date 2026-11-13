import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { deliverApprovalEmail } from "@/lib/approval-email-delivery";
import { ApprovalEmailError } from "@/lib/approval-email";

const harness = vi.hoisted(() => ({
  sql: vi.fn(),
  send: vi.fn(),
  log: vi.fn(),
}));
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => harness.sql }));
vi.mock("@/lib/server-events", () => ({ logServerEvent: harness.log }));
vi.mock("@/lib/approval-email", async (original) => ({
  ...(await original<typeof import("@/lib/approval-email")>()),
  sendApprovalEmail: harness.send,
}));
const claimed = {
  id: "notification-id",
  email: "person@example.test",
  sender: "Shardling <hello@shardling.com>",
  subject: "Frozen subject",
  body: "Frozen body",
};
beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

it("records provider acceptance with the exact queued payload", async () => {
  harness.sql.mockResolvedValueOnce([claimed]).mockResolvedValueOnce([]);
  harness.send.mockResolvedValueOnce("provider-id");
  expect(await deliverApprovalEmail(claimed.id)).toMatchObject({
    status: "sent",
    canRetry: false,
  });
  expect(harness.send).toHaveBeenCalledWith(claimed.id, {
    from: claimed.sender,
    to: [claimed.email],
    subject: claimed.subject,
    text: claimed.body,
  });
  expect(harness.sql.mock.calls[1].slice(1)).toContain("provider-id");
});

it("keeps a failed provider attempt retryable and logs only category/reference", async () => {
  harness.sql.mockResolvedValueOnce([claimed]).mockResolvedValueOnce([]);
  harness.send.mockRejectedValueOnce(
    new ApprovalEmailError("provider_unavailable", 503),
  );
  expect(await deliverApprovalEmail(claimed.id)).toMatchObject({
    status: "failed",
    canRetry: true,
    referenceId: expect.any(String),
  });
  expect(harness.log.mock.calls[0][0]).toMatchObject({
    event: "approval_email_failure",
    kind: "provider_unavailable",
    status: 503,
  });
  expect(JSON.stringify(harness.log.mock.calls)).not.toContain(claimed.email);
});

it("does not send twice when another request owns the claim or a send already succeeded", async () => {
  harness.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([
    {
      id: claimed.id,
      status: "sent",
      firstAttemptAt: new Date().toISOString(),
      claimedAt: null,
      referenceId: null,
    },
  ]);
  expect(await deliverApprovalEmail(claimed.id)).toMatchObject({
    status: "sent",
    canRetry: false,
  });
  expect(harness.send).not.toHaveBeenCalled();
});

it("does not send a revoked or superseded approval", async () => {
  harness.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
  expect(await deliverApprovalEmail(claimed.id)).toBeNull();
  expect(harness.send).not.toHaveBeenCalled();
});

it("does not mask persisted approval when notification storage fails", async () => {
  harness.sql.mockRejectedValueOnce(Error("database unavailable"));
  expect(await deliverApprovalEmail(claimed.id)).toMatchObject({
    status: "unknown",
    canRetry: false,
  });
  expect(harness.send).not.toHaveBeenCalled();
});
