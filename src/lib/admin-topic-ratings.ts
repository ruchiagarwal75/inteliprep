import "server-only";
import { requireAdminIdentity } from "./admin-auth";
import { reportingDb } from "./reporting-db";
import { recordScope } from "./admin-scope";
import { ADMIN_PAGE_SIZE, type adminQuery } from "./admin-query";

export async function adminTopicRatings(query: ReturnType<typeof adminQuery>) {
  await requireAdminIdentity();
  const sql = reportingDb();
  const from = sql`from (
    select coalesce(r.id,v.id) as id,coalesce(r.user_id,v.user_id) as user_id,
      coalesce(r.topic,v.topic) as topic,coalesce(r.level,v.level) as level,
      r.stars,r.skipped,r.dismissal_reason,v.shown_at,r.created_at as responded_at,
      greatest(r.created_at,v.shown_at) as activity_at
    from (select * from interview_admin.topic_ratings
      where ${recordScope(query.includeExcluded)}) r
    full join (select * from interview_admin.topic_rating_views
      where ${recordScope(query.includeExcluded)}) v using (user_id,environment)
    ) x
    left join interview_admin.registered_users u on u.id=x.user_id
    where position(lower(${query.search}) in lower(coalesce(u.email,'')))>0`;
  const [totals, rows] = await Promise.all([
    sql<
      {
        shown: number;
        rated: number;
        skipped: number;
        closed: number;
        unanswered: number;
        olderDismissals: number;
        average: string | null;
      }[]
    >`
      select count(x.shown_at)::int as shown,count(x.stars)::int as rated,
        count(*) filter(where x.dismissal_reason='skip')::int as skipped,
        count(*) filter(where x.dismissal_reason='close')::int as closed,
        count(*) filter(where x.responded_at is null)::int as unanswered,
        count(*) filter(where x.skipped and x.dismissal_reason is null)::int as "olderDismissals",
        round(avg(x.stars),1)::text as average ${from}`,
    sql<
      {
        id: string;
        userId: string;
        email: string | null;
        topic: string;
        level: number;
        stars: number | null;
        outcome:
          "rated" | "skipped" | "closed" | "older_dismissal" | "unanswered";
        shownAt: string | null;
        respondedAt: string | null;
        createdAt: string;
      }[]
    >`
      select x.id,x.user_id as "userId",u.email,x.topic,x.level,x.stars,
        case when x.stars is not null then 'rated'
          when x.dismissal_reason='skip' then 'skipped'
          when x.dismissal_reason='close' then 'closed'
          when x.skipped then 'older_dismissal' else 'unanswered' end as outcome,
        x.shown_at::text as "shownAt",x.responded_at::text as "respondedAt",
        x.activity_at::text as "createdAt" ${from}
      order by x.activity_at desc,x.id limit ${ADMIN_PAGE_SIZE}`,
  ]);
  if (!totals[0]) throw Error("Topic ratings unavailable");
  return { ...totals[0], entries: Array.from(rows) };
}
