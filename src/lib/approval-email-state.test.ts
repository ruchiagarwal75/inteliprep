import { expect, it } from "vitest";
import {
  approvalEmailState,
  APPROVAL_EMAIL_LEASE_MS,
  APPROVAL_EMAIL_RETRY_MS,
  type ApprovalEmailRecord,
} from "@/lib/approval-email-state";

const now = Date.parse("2026-11-08T12:00:00Z");
const row: ApprovalEmailRecord = {
  id: "notification-id",
  status: "pending",
  firstAttemptAt: null,
  claimedAt: null,
  referenceId: null,
  failureCategory: null,
};
it("allows pending or failed sends, but never an accepted email", () => {
  expect(approvalEmailState(row, now).canRetry).toBe(true);
  expect(approvalEmailState({ ...row, status: "failed" }, now).canRetry).toBe(
    true,
  );
  expect(approvalEmailState({ ...row, status: "sent" }, now).canRetry).toBe(
    false,
  );
});
it("waits for a bounded in-flight lease, then makes a crashed request recoverable", () => {
  const sending = {
    ...row,
    status: "sending" as const,
    claimedAt: new Date(now).toISOString(),
    firstAttemptAt: new Date(now).toISOString(),
  };
  expect(approvalEmailState(sending, now).canRetry).toBe(false);
  expect(
    approvalEmailState(sending, now + APPROVAL_EMAIL_LEASE_MS).canRetry,
  ).toBe(true);
});
it("prevents retries after the provider deduplication window, retaining sent records", () => {
  const attempted = {
    ...row,
    firstAttemptAt: new Date(now - APPROVAL_EMAIL_RETRY_MS).toISOString(),
  };
  expect(
    approvalEmailState({ ...attempted, status: "failed" }, now),
  ).toMatchObject({ status: "unknown", canRetry: false });
  expect(
    approvalEmailState({ ...attempted, status: "sent" }, now),
  ).toMatchObject({ status: "sent", canRetry: false });
});
