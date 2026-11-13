import "server-only";
import { requireAdminIdentity } from "@/lib/admin-auth";
import { configuredAdminId } from "@/lib/admin-config";
import { reportingDb } from "@/lib/reporting-db";
import { ADMIN_PAGE_SIZE, adminQuery } from "@/lib/admin-query";
import { betaInviteChange } from "@/lib/beta-invite-input";
import { writeBetaInvite } from "@/lib/beta-invite-write";
import { deliverApprovalEmail } from "@/lib/approval-email-delivery";
import {
  approvalEmailState,
  type ApprovalEmailRecord,
  type ApprovalEmailState,
} from "@/lib/approval-email-state";

export type BetaInvite = {
  email: string;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
  notification?: ApprovalEmailState | null;
};
export type PendingBetaAccount = {
  id: string;
  email: string;
  signupAt: string;
};

export function adminInviteQuery(params: URLSearchParams) {
  return {
    ...adminQuery(params),
    pendingPage: adminQuery(
      new URLSearchParams({ page: params.get("pendingPage") ?? "1" }),
    ).page,
  };
}

export async function adminInvites(query: ReturnType<typeof adminInviteQuery>) {
  await requireAdminIdentity();
  const sql = reportingDb();
  const pendingFilter = sql`u.email is not null and btrim(u.email)<>''
    and u.id is distinct from ${configuredAdminId() ?? null}::uuid and i.email is null
    and position(${query.search.toLowerCase()} in lower(u.email))>0`;
  const [rows, count, pending, pendingCount] = await Promise.all([
    sql<
      (BetaInvite & { emailRecord: ApprovalEmailRecord | null })[]
    >`select i.email,i.approved,i.created_at::text as "createdAt",i.updated_at::text as "updatedAt",
        case when n.id is null then null else jsonb_build_object('id',n.id,'status',n.status,
          'firstAttemptAt',n.first_attempt_at::text,'claimedAt',n.claimed_at::text,'referenceId',n.reference_id,'failureCategory',n.failure_category) end as "emailRecord"
      from interview_admin.beta_invites i left join interview_admin.beta_approval_emails n
        on n.email=i.email and n.approval_updated_at=i.updated_at and i.approved
      where position(${query.search.toLowerCase()} in i.email)>0
      order by i.updated_at desc,i.email limit ${ADMIN_PAGE_SIZE} offset ${(query.page - 1) * ADMIN_PAGE_SIZE}`,
    sql<
      { count: number }[]
    >`select count(*)::int as count from interview_admin.beta_invites
      where position(${query.search.toLowerCase()} in email)>0`,
    sql<
      PendingBetaAccount[]
    >`select u.id,lower(btrim(u.email)) as email,u.created_at::text as "signupAt"
      from interview_admin.registered_users u left join interview_admin.beta_invites i on i.email=lower(btrim(u.email))
      where ${pendingFilter} order by u.created_at desc,u.id
      limit ${ADMIN_PAGE_SIZE} offset ${(query.pendingPage - 1) * ADMIN_PAGE_SIZE}`,
    sql<
      { count: number }[]
    >`select count(*)::int as count from interview_admin.registered_users u
      left join interview_admin.beta_invites i on i.email=lower(btrim(u.email)) where ${pendingFilter}`,
  ]);
  return {
    invites: rows.map(({ emailRecord, ...invite }) => ({
      ...invite,
      notification: emailRecord ? approvalEmailState(emailRecord) : null,
    })),
    total: count[0]?.count ?? 0,
    page: query.page,
    pageSize: ADMIN_PAGE_SIZE,
    pending,
    pendingTotal: pendingCount[0]?.count ?? 0,
    pendingPage: query.pendingPage,
  };
}

export async function setBetaInvite(input: unknown) {
  const actor = await requireAdminIdentity();
  const { email, approved } = betaInviteChange.parse(input);
  const { invite, notificationId } = await writeBetaInvite(
    email,
    approved,
    actor,
  );
  return {
    invite,
    notification: notificationId
      ? await deliverApprovalEmail(notificationId)
      : null,
  };
}
