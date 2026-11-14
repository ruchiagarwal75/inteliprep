import "server-only";
import { randomUUID } from "node:crypto";
import type { TransactionSql } from "postgres";
import { reportingEnvironment } from "@/lib/admin-config";
import { reportingDb } from "@/lib/reporting-db";
import { AI_BUDGET, AiBudgetError } from "@/lib/ai-budget-config";
import { budgetDay, lockBudgetDay } from "@/lib/ai-budget-store";

/** Called within the existing owner transaction, before publishing a new session.
 * The request key makes retries reuse the same hold. No provider calls here.
 */
export async function reserveMockBudget(
  sql: TransactionSql,
  userId: string,
  requestId: string,
) {
  if (reportingEnvironment() !== "production") return;
  const day = budgetDay(),
    state = await lockBudgetDay(sql, day);
  const [previous] = await sql<
    { id: string }[]
  >`select id from interview_admin.ai_budget_reservations where user_id=${userId} and request_id=${requestId}`;
  if (previous) return previous.id;
  if (
    state.spent + state.uncertain + state.held + AI_BUDGET.mockReserveUsd >
    AI_BUDGET.capUsd
  )
    throw new AiBudgetError();
  const id = randomUUID();
  await sql`insert into interview_admin.ai_budget_reservations(id,day,kind,user_id,request_id,held_usd,protected_usd,expires_at)
    values(${id},${day},'mock',${userId},${requestId},${AI_BUDGET.mockReserveUsd},${AI_BUDGET.scorecardReserveUsd},now()+interval '2 hours')`;
  return id;
}
export async function bindMockBudget(
  sql: TransactionSql,
  id: string | undefined,
  interviewId: string,
  deadlineAt: string | undefined,
) {
  if (!id) return;
  await sql`update interview_admin.ai_budget_reservations set interview_id=${interviewId},expires_at=coalesce(${deadlineAt ?? null}::timestamptz,now()+interval '1 hour')+interval '15 minutes' where id=${id}`;
}
export async function releaseMockBudget(interviewId: string) {
  if (reportingEnvironment() !== "production") return;
  const sql = reportingDb();
  const rows = await sql<
    { day: string }[]
  >`select day::text as day from interview_admin.ai_budget_reservations where interview_id=${interviewId} and kind='mock' and not settled`;
  for (const row of rows)
    await sql.begin(async (tx) => {
      await lockBudgetDay(tx, row.day);
      await tx`update interview_admin.ai_budget_reservations set held_usd=0,protected_usd=0,settled=true where interview_id=${interviewId} and day=${row.day} and kind='mock'`;
    });
}
