import "server-only";
import { requireAdminIdentity } from "./admin-auth";
import { reportingDb } from "./reporting-db";
import { recordScope } from "./admin-scope";
import { ADMIN_PAGE_SIZE, type adminQuery } from "./admin-query";

export async function adminTopicRatings(query: ReturnType<typeof adminQuery>) {
  await requireAdminIdentity();
  const sql = reportingDb();
  const from = sql`from (select * from interview_admin.topic_ratings
    where ${recordScope(query.includeExcluded)}) r
    left join interview_admin.registered_users u on u.id=r.user_id
    where position(lower(${query.search}) in lower(coalesce(u.email,'')))>0`;
  const [totals, rows] = await Promise.all([
    sql<{ rated: number; skipped: number; average: string | null }[]>`
      select count(*) filter(where not r.skipped)::int as rated,
        count(*) filter(where r.skipped)::int as skipped,
        round(avg(r.stars),1)::text as average ${from}`,
    sql<
      {
        id: string;
        userId: string;
        email: string | null;
        topic: string;
        level: number;
        stars: number | null;
        skipped: boolean;
        createdAt: string;
      }[]
    >`
      select r.id,r.user_id as "userId",u.email,r.topic,r.level,r.stars,r.skipped,
        r.created_at::text as "createdAt" ${from}
      order by r.created_at desc,r.id limit ${ADMIN_PAGE_SIZE}`,
  ]);
  if (!totals[0]) throw Error("Topic ratings unavailable");
  return { ...totals[0], entries: Array.from(rows) };
}
