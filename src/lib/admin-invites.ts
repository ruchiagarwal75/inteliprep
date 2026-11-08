import "server-only";
import { requireAdminIdentity } from "@/lib/admin-auth";
import { reportingDb } from "@/lib/reporting-db";
import { ADMIN_PAGE_SIZE, type adminQuery } from "@/lib/admin-query";
import { betaInviteChange } from "@/lib/beta-invite-input";

export type BetaInvite = {
  email: string;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function adminInvites(query: ReturnType<typeof adminQuery>) {
  await requireAdminIdentity();
  const sql = reportingDb();
  const [rows, count] = await Promise.all([
    sql<
      BetaInvite[]
    >`select email,approved,created_at::text as "createdAt",updated_at::text as "updatedAt"
      from interview_admin.beta_invites where position(${query.search.toLowerCase()} in email)>0
      order by updated_at desc,email limit ${ADMIN_PAGE_SIZE} offset ${(query.page - 1) * ADMIN_PAGE_SIZE}`,
    sql<
      { count: number }[]
    >`select count(*)::int as count from interview_admin.beta_invites
      where position(${query.search.toLowerCase()} in email)>0`,
  ]);
  return {
    invites: rows,
    total: count[0]?.count ?? 0,
    page: query.page,
    pageSize: ADMIN_PAGE_SIZE,
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
