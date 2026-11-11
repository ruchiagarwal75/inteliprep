import "server-only";
import { reportingConfigured, reportingDb } from "@/lib/reporting-db";
import { reportingEnvironment } from "@/lib/admin-config";
import { logServerEvent } from "@/lib/server-events";
import { PLAY_LIMITS } from "./config";
import { logPlayFailure } from "./log";
let alertedDay = "";
/** Existing usage records include paid failures/retries. Missing prices remain unknown. */
export async function checkDailyAiSpend() {
  if (!reportingConfigured()) return;
  const day = new Date().toISOString().slice(0, 10),
    environment = reportingEnvironment();
  if (alertedDay === day + environment) return;
  try {
    const sql = reportingDb();
    const [row] =
      await sql`select coalesce(sum(estimated_cost_usd),0) as known_cost,count(*) filter(where estimated_cost_usd is null)::integer as unknown_calls from interview_admin.ai_calls where environment=${environment} and started_at>=${day + "T00:00:00.000Z"}`;
    if (Number(row.known_cost) >= PLAY_LIMITS.dailyAiSpendAlertUsd) {
      alertedDay = day + environment;
      logServerEvent({
        event: "play_spend_threshold",
        kind: "known_cost_lower_bound",
        estimatedCostUsd: Number(row.known_cost),
        unknownUsageCalls: row.unknown_calls,
      });
    }
  } catch (cause) {
    logPlayFailure("spend_check", cause);
  }
}
