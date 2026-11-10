import type { ApprovalEmailState } from "@/lib/approval-email-state";

export function AdminApprovalEmail({
  notification,
  approved,
  busy,
  onRetry,
}: {
  notification?: ApprovalEmailState | null;
  approved: boolean;
  busy: boolean;
  onRetry: (id: string) => void;
}) {
  if (!approved) return <span>Not applicable</span>;
  if (!notification) return <span>Not requested</span>;
  const labels = {
    pending: "Waiting to send",
    sending: "Sending. Refresh to check.",
    sent: "Sent to email provider",
    failed: "Email failed. Access is approved.",
    unknown: "Delivery unconfirmed. Check Resend before resending.",
  };
  return (
    <div className="space-y-2">
      <p>{labels[notification.status]}</p>
      {notification.canRetry && (
        <button
          type="button"
          className="practice-secondary"
          disabled={busy}
          onClick={() => onRetry(notification.id)}
          aria-label={`Retry approval email ${notification.id}`}
        >
          Retry email
        </button>
      )}
      {notification.status !== "sent" && notification.referenceId && (
        <p className="text-xs">Reference: {notification.referenceId}</p>
      )}
    </div>
  );
}
