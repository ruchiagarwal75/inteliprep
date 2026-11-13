import { BRAND } from "@/lib/brand";

export type ApprovalEmailFailureCategory =
  | "configuration"
  | "sender_domain_unverified"
  | "provider_authentication"
  | "provider_limit"
  | "provider_unavailable"
  | "provider_request"
  | "provider_response"
  | "network_or_timeout"
  | "notification_storage";

export type ApprovalEmailStatus =
  "pending" | "sending" | "sent" | "failed" | "unknown";

export type ApprovalEmailState = {
  id: string;
  status: ApprovalEmailStatus;
  canRetry: boolean;
  referenceId: string | null;
  failureCategory: string | null;
};

export type ApprovalEmailRecord = {
  id: string;
  status: ApprovalEmailStatus;
  firstAttemptAt: string | null;
  claimedAt: string | null;
  referenceId: string | null;
  failureCategory: string | null;
};

/** Only fixed operator guidance reaches the browser, never provider response text. */
export function approvalEmailFailureMessage(category: string | null): string {
  switch (category) {
    case "sender_domain_unverified":
      return `The ${BRAND.domain} domain is not verified. Verify ${BRAND.domain} in Resend, then retry the email.`;
    case "configuration":
      return "Configure the server's RESEND_API_KEY, then retry the email.";
    case "provider_authentication":
      return `Check the Resend API key and its permission to send from ${BRAND.domain}.`;
    case "provider_limit":
      return "Resend's sending limit was reached. Check the limit before retrying.";
    case "provider_unavailable":
      return "Resend is temporarily unavailable. Retry the email shortly.";
    case "network_or_timeout":
      return "Resend did not confirm delivery. Retry within the allowed window.";
    case "notification_storage":
      return "Email status could not be saved. Check Resend before retrying.";
    default:
      return "Check the failed request in Resend before retrying the email.";
  }
}

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
    failureCategory: row.failureCategory,
  };
}
