import "server-only";
import { requireAdminIdentity } from "@/lib/admin-auth";
import { reportingDb } from "@/lib/reporting-db";
import { reportingEnvironment } from "@/lib/admin-config";
import {
  approvalEmailState,
  type ApprovalEmailRecord,
} from "@/lib/approval-email-state";
import type { NotificationKind } from "@/lib/notification-templates";
import { deliverNotification } from "@/lib/notifications";

export async function adminNotifications() {
  await requireAdminIdentity();
  const rows = await reportingDb()<
    (ApprovalEmailRecord & {
      kind: NotificationKind;
      recipient: string;
      createdAt: string;
    })[]
  >`
    select id,kind,recipient,created_at::text as "createdAt",status,
      first_attempt_at::text as "firstAttemptAt",claimed_at::text as "claimedAt",
      reference_id as "referenceId",failure_category as "failureCategory"
    from interview_admin.notifications where environment=${reportingEnvironment()}
    order by created_at desc limit 20`;
  return rows.map((row) => ({
    ...approvalEmailState(row),
    kind: row.kind,
    recipient: row.recipient,
    createdAt: row.createdAt,
  }));
}
export async function retryAdminNotification(id: string) {
  await requireAdminIdentity();
  await deliverNotification(id);
}
