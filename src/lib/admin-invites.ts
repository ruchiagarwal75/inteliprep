import "server-only";
import { requireAdminIdentity } from "@/lib/admin-auth";
import { configuredAdminId } from "@/lib/admin-config";
import { reportingDb } from "@/lib/reporting-db";
import { ADMIN_PAGE_SIZE, adminQuery } from "@/lib/admin-query";
import { betaInviteChange } from "@/lib/beta-invite-input";

export type BetaInvite = {
  email: string;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
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
      BetaInvite[]
    >`select email,approved,created_at::text as "createdAt",updated_at::text as "updatedAt"
      from interview_admin.beta_invites where position(${query.search.toLowerCase()} in email)>0
      order by updated_at desc,email limit ${ADMIN_PAGE_SIZE} offset ${(query.page - 1) * ADMIN_PAGE_SIZE}`,
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
    invites: rows,
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
  const sql = reportingDb();
  const [invite] = await sql<
    BetaInvite[]
  >`insert into interview_admin.beta_invites (email,approved,updated_by)
    values (${email},${approved},${actor}) on conflict (email) do update
    set approved=excluded.approved,updated_at=case when beta_invites.approved is distinct from excluded.approved then now() else beta_invites.updated_at end,
      updated_by=case when beta_invites.approved is distinct from excluded.approved then excluded.updated_by else beta_invites.updated_by end
    returning email,approved,created_at::text as "createdAt",updated_at::text as "updatedAt"`;
  return { invite };
}
