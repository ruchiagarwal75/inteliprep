import "server-only";
import { randomUUID } from "node:crypto";
import type { TransactionSql } from "postgres";
import { reportingDb } from "@/lib/reporting-db";
import {
  sendApprovalEmail,
  ApprovalEmailError,
  type ApprovalEmailPayload,
} from "@/lib/approval-email";
import { reportingEnvironment } from "@/lib/admin-config";
import { logServerEvent } from "@/lib/server-events";
import type { NotificationKind } from "@/lib/notification-templates";

/** Insert in the business transaction. A stable event key deduplicates across instances. */
export async function queueNotification(
  sql: TransactionSql,
  kind: NotificationKind,
  eventKey: string,
  payload: ApprovalEmailPayload,
) {
  const [row] = await sql<
    { id: string }[]
  >`insert into interview_admin.notifications
    (id,environment,event_key,kind,recipient,sender,subject,body)
    values(${randomUUID()},${reportingEnvironment()},${eventKey},${kind},${payload.to[0]},${payload.from},${payload.subject},${payload.text})
    on conflict(environment,event_key) do nothing returning id`;
  return row?.id;
}

/** Provider I/O is outside transactions. Stable keys and fenced leases prevent duplicates. */
export async function deliverNotification(id: string) {
  if (reportingEnvironment() !== "production") return;
  const reference = randomUUID(),
    sql = reportingDb();
  const [row] = await sql<
    {
      id: string;
      recipient: string;
      sender: string;
      subject: string;
      body: string;
    }[]
  >`
    update interview_admin.notifications set status='sending',claimed_at=now(),
      first_attempt_at=coalesce(first_attempt_at,now()),attempts=attempts+1,reference_id=${reference}
    where id=${id} and environment='production' and status in ('pending','failed','sending')
      and (status<>'sending' or claimed_at<now()-interval '30 seconds')
      and (first_attempt_at is null or first_attempt_at>now()-interval '23 hours')
    returning id,recipient,sender,subject,body`;
  if (!row) return;
  try {
    const providerId = await sendApprovalEmail(row.id, {
      from: row.sender,
      to: [row.recipient],
      subject: row.subject,
      text: row.body,
    });
    await sql`update interview_admin.notifications set status='sent',sent_at=now(),provider_id=${providerId},failure_category=null where id=${id} and reference_id=${reference}`;
    logServerEvent({ event: "notification_sent", requestId: reference });
  } catch (cause) {
    const category =
      cause instanceof ApprovalEmailError
        ? cause.category
        : "notification_storage";
    await sql`update interview_admin.notifications set status='failed',failure_category=${category} where id=${id} and reference_id=${reference}`;
    logServerEvent(
      { event: "notification_failure", requestId: reference, kind: category },
      cause,
    );
  }
}

/** Bounded opportunistic retries. No recurring worker or email on GET-only admin views. */
export async function drainNotifications() {
  if (reportingEnvironment() !== "production") return;
  const sql = reportingDb();
  const rows = await sql<
    { id: string }[]
  >`select id from interview_admin.notifications
    where environment='production' and status in ('pending','failed','sending')
      and (claimed_at is null or claimed_at<now()-interval '5 minutes')
      and (first_attempt_at is null or first_attempt_at>now()-interval '23 hours')
    order by created_at limit 3`;
  for (const row of rows) await deliverNotification(row.id);
}
