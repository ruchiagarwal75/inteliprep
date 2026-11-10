export type ApprovalEmailStatus =
  "pending" | "sending" | "sent" | "failed" | "unknown";

export type ApprovalEmailState = {
  id: string;
  status: ApprovalEmailStatus;
  canRetry: boolean;
  referenceId: string | null;
};

export type ApprovalEmailRecord = {
  id: string;
  status: ApprovalEmailStatus;
  firstAttemptAt: string | null;
  claimedAt: string | null;
  referenceId: string | null;
};

// Resend deduplicates for 24 hours. Stop earlier to allow for clock differences.
export const APPROVAL_EMAIL_RETRY_MS = 23 * 60 * 60 * 1000;
export const APPROVAL_EMAIL_LEASE_MS = 30_000;

export function approvalEmailState(
  row: ApprovalEmailRecord,
  now = Date.now(),
): ApprovalEmailState {
  const expired =
    row.firstAttemptAt !== null &&
    now - Date.parse(row.firstAttemptAt) >= APPROVAL_EMAIL_RETRY_MS;
  const status = row.status !== "sent" && expired ? "unknown" : row.status;
  const leased =
    status === "sending" &&
    row.claimedAt !== null &&
    now - Date.parse(row.claimedAt) < APPROVAL_EMAIL_LEASE_MS;
  return {
    id: row.id,
    status,
    canRetry: !leased && status !== "sent" && status !== "unknown",
    referenceId: row.referenceId,
  };
}
