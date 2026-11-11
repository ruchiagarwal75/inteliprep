import "server-only";
import { requireAdminIdentity } from "@/lib/admin-auth";
import { reportingDb } from "@/lib/reporting-db";
import { reportingEnvironment } from "@/lib/admin-config";
import { recordScope } from "@/lib/admin-scope";
import { ADMIN_PAGE_SIZE, type adminQuery } from "@/lib/admin-query";
import type { PracticeFeedbackRecord } from "@/lib/practice-feedback";

export type AdminPracticeFeedback = PracticeFeedbackRecord & {
  email: string | null;
  problemId: string | null;
  level: string | null;
};
export type FeedbackCounts = {
  answered: number;
  skipped: number;
  menu: number;
  loved: number;
  okay: number;
  not_for_me: number;
  yes: number;
  maybe: number;
  no: number;
  talk: number;
  type: number;
  no_preference: number;
};

export async function adminPracticeFeedback(
  query: ReturnType<typeof adminQuery>,
) {
  await requireAdminIdentity();
  const sql = reportingDb();
  const from = sql`from (select * from interview_admin.feedback where ${recordScope(query.includeExcluded)}) f
    left join interview_admin.registered_users u on u.id=f.user_id
    left join interview_admin.interviews i on i.id=f.interview_id and i.user_id=f.user_id
    where position(lower(${query.search}) in lower(coalesce(u.email,'')||' '||coalesce(f.comment,'')))>0`;
  const [entries, totals] = await Promise.all([
    sql<
      AdminPracticeFeedback[]
    >`select f.id,f.user_id as "userId",f.interview_id as "interviewId",f.source,f.skipped,f.liked,
      f.would_return as "wouldReturn",f.input_preference as "inputPreference",f.comment,f.created_at::text as "createdAt",f.updated_at::text as "updatedAt",
      u.email,i.problem_id as "problemId",i.level ${from}
      order by f.created_at desc,f.id limit ${ADMIN_PAGE_SIZE} offset ${(query.page - 1) * ADMIN_PAGE_SIZE}`,
    sql<(FeedbackCounts & { total: number })[]>`select count(*)::int as total,
      count(*) filter(where f.source='interview_end' and not f.skipped)::int as answered,
      count(*) filter(where f.source='interview_end' and f.skipped)::int as skipped,
      count(*) filter(where f.source='menu')::int as menu,
      count(*) filter(where not f.skipped and f.liked='loved')::int as loved,
      count(*) filter(where not f.skipped and f.liked='okay')::int as okay,
      count(*) filter(where not f.skipped and f.liked='not_for_me')::int as not_for_me,
      count(*) filter(where not f.skipped and f.would_return='yes')::int as yes,
      count(*) filter(where not f.skipped and f.would_return='maybe')::int as maybe,
      count(*) filter(where not f.skipped and f.would_return='no')::int as no,
      count(*) filter(where not f.skipped and f.input_preference='talk')::int as talk,
      count(*) filter(where not f.skipped and f.input_preference='type')::int as type,
      count(*) filter(where not f.skipped and f.input_preference='no_preference')::int as no_preference ${from}`,
  ]);
  if (!totals[0]) throw new Error("Feedback counts unavailable");
  return {
    entries: Array.from(entries),
    counts: totals[0],
    total: totals[0].total,
    page: query.page,
    pageSize: ADMIN_PAGE_SIZE,
    environment: reportingEnvironment(),
  };
}
