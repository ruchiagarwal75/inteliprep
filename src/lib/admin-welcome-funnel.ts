import "server-only";
import { requireAdminIdentity } from "./admin-auth";
import { reportingDb } from "./reporting-db";
import { recordScope } from "./admin-scope";
import type { betaFunnelQuery } from "./beta-funnel-query";
import type { WelcomeCounts } from "./play/welcome-public";
/** Fresh admin authorization, then a transaction-local read of event metadata only. */
export async function adminWelcomeFunnel(
  query: ReturnType<typeof betaFunnelQuery>,
) {
  await requireAdminIdentity();
  return reportingDb().begin(async (sql) => {
    await sql`select set_config('mockmeai.admin_read','true',true)`;
    const [row] = await sql<WelcomeCounts[]>`select
     count(*) filter(where event='intro_shown')::int as shown,
     count(*) filter(where event='intro_skipped')::int as skipped,
     count(*) filter(where event='intro_completed')::int as completed,
     count(*) filter(where event='first_topic_started_from_intro')::int as "topicStarted"
     from practice_game.play_events e left join interview_admin.registered_users u on u.id=e.user_id
     where ${recordScope(query.includeExcluded)} and e.created_at>=${query.from}::date and e.created_at<${query.until}::timestamptz
     and position(lower(${query.search}) in lower(coalesce(u.email,'')))>0`;
    if (!row) throw Error("Intro funnel unavailable");
    return row;
  });
}
