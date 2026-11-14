import "server-only";
import type { TransactionSql } from "postgres";
import { AI_BUDGET } from "@/lib/ai-budget-config";
import { queueNotification } from "@/lib/notifications";
import { spendNotification } from "@/lib/notification-templates";

export async function lockBudgetDay(sql: TransactionSql, day: string) {
  await sql`insert into interview_admin.ai_budget_days(day) values(${day}) on conflict do nothing`;
  await sql`select day from interview_admin.ai_budget_days where day=${day} for update`;
  await sql`update interview_admin.ai_budget_reservations set held_usd=0,protected_usd=0,settled=true where day=${day} and kind='mock' and not settled and expires_at<=now()`;
  return readBudgetTotals(sql, day);
}
export async function readBudgetTotals(sql: TransactionSql, day: string) {
  const [row] = await sql<
    { spent: string; uncertain: string }[]
  >`select spent_usd::text as spent,uncertain_usd::text as uncertain from interview_admin.ai_budget_days where day=${day}`;
  const [held] = await sql<
    { amount: string }[]
  >`select coalesce(sum(held_usd),0)::text as amount from interview_admin.ai_budget_reservations where day=${day} and not settled and (kind='call' or expires_at>now())`;
  // Also reconcile older deployments and late-arriving usage on every decision.
  // A metered call keeps its reservation row, so its reporting row is never counted twice.
  const [legacy] = await sql<
    { spent: string; uncertain: string }[]
  >`select coalesce(sum(c.estimated_cost_usd),0)::text as spent,
    (count(*) filter(where c.estimated_cost_usd is null)*${AI_BUDGET.legacyUnknownCallUsd}::numeric)::text as uncertain
    from interview_admin.ai_calls c where c.environment='production'
      and c.started_at>=${day + "T00:00:00Z"}::timestamptz and c.started_at<${day + "T00:00:00Z"}::timestamptz+interval '1 day'
      and not exists(select 1 from interview_admin.ai_budget_reservations r where r.id=c.id)`;
  return {
    spent: Number(row?.spent ?? 0) + Number(legacy.spent),
    uncertain: Number(row?.uncertain ?? 0) + Number(legacy.uncertain),
    held: Number(held.amount),
  };
}
export async function budgetNotifications(
  sql: TransactionSql,
  day: string,
  state: { spent: number; uncertain: number; held: number },
  denied = false,
) {
  if (state.spent >= AI_BUDGET.warningUsd)
    await queueNotification(
      sql,
      "spend_warning",
      `spend-warning/${day}`,
      spendNotification(
        "spend_warning",
        day,
        state.spent,
        state.held + state.uncertain,
      ),
    );
  if (denied || state.spent + state.uncertain + state.held >= AI_BUDGET.capUsd)
    await queueNotification(
      sql,
      "spend_cap",
      `spend-cap/${day}`,
      spendNotification(
        "spend_cap",
        day,
        state.spent,
        state.held + state.uncertain,
      ),
    );
}
export const budgetDay = () => new Date().toISOString().slice(0, 10);
