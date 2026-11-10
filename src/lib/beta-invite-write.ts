import "server-only";
import { randomUUID } from "node:crypto";
import { reportingDb } from "@/lib/reporting-db";
import { approvalEmailPayload } from "@/lib/approval-email";
import type { BetaInvite } from "@/lib/admin-invites";

/** Approval and its durable notification are committed together. No provider I/O in a transaction. */
export async function writeBetaInvite(
  email: string,
  approved: boolean,
  actor: string,
) {
  const sql = reportingDb();
  return sql.begin(async (tx) => {
    const [changed] = await tx<BetaInvite[]>`
      insert into interview_admin.beta_invites (email,approved,updated_by)
      values (${email},${approved},${actor}) on conflict (email) do update
      set approved=excluded.approved,updated_at=clock_timestamp(),updated_by=excluded.updated_by
      where beta_invites.approved is distinct from excluded.approved
      returning email,approved,created_at::text as "createdAt",updated_at::text as "updatedAt"`;
    if (!changed) {
      const [invite] = await tx<BetaInvite[]>`
        select email,approved,created_at::text as "createdAt",updated_at::text as "updatedAt"
        from interview_admin.beta_invites where email=${email}`;
      return { invite, notificationId: undefined };
    }
    if (!approved) return { invite: changed, notificationId: undefined };
    const id = randomUUID();
    const payload = approvalEmailPayload(email);
    await tx`insert into interview_admin.beta_approval_emails
      (id,email,approval_updated_at,sender,subject,body)
      values (${id},${email},${changed.updatedAt},${payload.from},${payload.subject},${payload.text})`;
    return { invite: changed, notificationId: id };
  });
}
