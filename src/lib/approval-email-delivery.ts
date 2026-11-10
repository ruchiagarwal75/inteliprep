import "server-only";
import { randomUUID } from "node:crypto";
import { reportingDb } from "@/lib/reporting-db";
import { ApprovalEmailError, sendApprovalEmail } from "@/lib/approval-email";
import {
  approvalEmailState,
  type ApprovalEmailRecord,
  type ApprovalEmailState,
} from "@/lib/approval-email-state";
import { logServerEvent } from "@/lib/server-events";

type ClaimedEmail = {
  id: string;
  email: string;
  sender: string;
  subject: string;
  body: string;
};

/** Called only by owner-authorized approval/retry operations. GET never sends. */
export async function deliverApprovalEmail(
  id: string,
): Promise<ApprovalEmailState | null> {
  const referenceId = randomUUID();
  try {
    const sql = reportingDb();
    const [claimed] = await sql<ClaimedEmail[]>`
      update interview_admin.beta_approval_emails n
      set status='sending',claimed_at=clock_timestamp(),first_attempt_at=coalesce(first_attempt_at,clock_timestamp()),reference_id=${referenceId}
      from interview_admin.beta_invites i
      where n.id=${id} and i.email=n.email and i.approved and i.updated_at=n.approval_updated_at
        and n.status in ('pending','failed','sending')
        and (n.status<>'sending' or n.claimed_at<now()-interval '30 seconds')
        and (n.first_attempt_at is null or n.first_attempt_at>now()-interval '23 hours')
      returning n.id,n.email,n.sender,n.subject,n.body`;
    if (!claimed) {
      const [row] = await sql<ApprovalEmailRecord[]>`
        select n.id,n.status,n.first_attempt_at::text as "firstAttemptAt",n.claimed_at::text as "claimedAt",n.reference_id as "referenceId"
        from interview_admin.beta_approval_emails n join interview_admin.beta_invites i
          on i.email=n.email and i.updated_at=n.approval_updated_at and i.approved where n.id=${id}`;
      return row ? approvalEmailState(row) : null;
    }
    try {
      const providerId = await sendApprovalEmail(id, {
        from: claimed.sender,
        to: [claimed.email],
        subject: claimed.subject,
        text: claimed.body,
      });
      await sql`update interview_admin.beta_approval_emails set status='sent',sent_at=clock_timestamp(),provider_id=${providerId},failure_category=null
        where id=${id} and reference_id=${referenceId}`;
      logServerEvent({ event: "approval_email_sent", requestId: referenceId });
      return { id, status: "sent", canRetry: false, referenceId };
    } catch (cause) {
      const category =
        cause instanceof ApprovalEmailError
          ? cause.category
          : "notification_storage";
      logServerEvent(
        {
          event: "approval_email_failure",
          requestId: referenceId,
          kind: category,
          status:
            cause instanceof ApprovalEmailError ? cause.status : undefined,
        },
        cause,
      );
      // The approval already committed. An email outage never revokes access.
      await sql`update interview_admin.beta_approval_emails set status='failed',failure_category=${category}
        where id=${id} and reference_id=${referenceId} and status<>'sent'`;
      return { id, status: "failed", canRetry: true, referenceId };
    }
  } catch (cause) {
    logServerEvent(
      {
        event: "approval_email_failure",
        requestId: referenceId,
        kind: "notification_storage",
      },
      cause,
    );
    return { id, status: "unknown", canRetry: false, referenceId };
  }
}
