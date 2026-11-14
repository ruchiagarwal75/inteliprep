import "server-only";
import { reportingDb } from "@/lib/reporting-db";
import { reportingEnvironment } from "@/lib/admin-config";
import { reportingContext } from "@/lib/reporting-context";
import { deferReporting } from "@/lib/reporting-write";
import { drainNotifications } from "@/lib/notifications";
import { logServerEvent } from "@/lib/server-events";
import { AI_BUDGET, AiBudgetError } from "@/lib/ai-budget-config";
import {
  budgetDay,
  lockBudgetDay,
  budgetNotifications,
} from "@/lib/ai-budget-store";
export type BudgetCall = { id: string; day: string; reserved: number };

/** All paid operations, including retries, reserve before the provider is contacted. */
export async function reserveModelBudget(
  id: string,
  amount: number,
  feedback: boolean,
): Promise<BudgetCall | undefined> {
  if (reportingEnvironment() !== "production") return;
  const context = reportingContext(),
    day = budgetDay();
  try {
    const accepted = await reportingDb().begin(async (sql) => {
      const state = await lockBudgetDay(sql, day);
      const [pool] = context?.interviewId
        ? await sql<
            { id: string; held: string; protected: string }[]
          >`select id,held_usd::text as held,protected_usd::text as protected from interview_admin.ai_budget_reservations where day=${day} and interview_id=${context.interviewId} and kind='mock' and not settled limit 1`
        : [];
      const allowance = pool
        ? Math.max(
            0,
            Number(pool.held) - (feedback ? 0 : Number(pool.protected)),
          )
        : 0;
      const borrowed = Math.min(amount, allowance);
      const denied =
        state.spent + state.uncertain + state.held + amount - borrowed >
        AI_BUDGET.capUsd;
      await budgetNotifications(sql, day, state, denied);
      if (denied) return false;
      if (pool)
        await sql`update interview_admin.ai_budget_reservations set held_usd=held_usd-${borrowed},protected_usd=least(protected_usd,held_usd-${borrowed}) where id=${pool.id}`;
      await sql`insert into interview_admin.ai_budget_reservations(id,day,kind,user_id,interview_id,parent_id,held_usd)
        values(${id},${day},'call',${context?.userId ?? null},${context?.interviewId ?? null},${pool?.id ?? null},${amount})`;
      return true;
    });
    deferReporting(drainNotifications);
    if (!accepted) throw new AiBudgetError();
    return { id, day, reserved: amount };
  } catch (cause) {
    if (cause instanceof AiBudgetError) throw cause;
    logServerEvent({ event: "api_failure", kind: "ai_budget_storage" }, cause);
    throw new AiBudgetError(503);
  }
}

/** Unknown usage stays charged conservatively. Accounting failure never loses a reply. */
export async function settleModelBudget(
  call: BudgetCall | undefined,
  cost: number | null,
) {
  if (!call) return;
  try {
    await reportingDb().begin(async (sql) => {
      const state = await lockBudgetDay(sql, call.day);
      const [row] = await sql<
        { held: string; parent: string | null }[]
      >`update interview_admin.ai_budget_reservations set settled=true,held_usd=0,unknown_usage=${cost === null}
        where id=${call.id} and not settled returning ${call.reserved}::text as held,parent_id as parent`;
      if (!row) return;
      const charged = cost ?? call.reserved,
        refund = Math.max(0, call.reserved - charged);
      await sql`update interview_admin.ai_budget_days set spent_usd=spent_usd+${cost ?? 0},uncertain_usd=uncertain_usd+${cost === null ? charged : 0} where day=${call.day}`;
      let returned = 0;
      if (row.parent && refund) {
        const changed =
          await sql`update interview_admin.ai_budget_reservations set held_usd=held_usd+${refund},protected_usd=least(${AI_BUDGET.scorecardReserveUsd},held_usd+${refund}) where id=${row.parent} and not settled returning id`;
        if (changed.length) returned = refund;
      }
      await budgetNotifications(sql, call.day, {
        spent: state.spent + (cost ?? 0),
        uncertain: state.uncertain + (cost === null ? charged : 0),
        held: state.held - call.reserved + returned,
      });
    });
    deferReporting(drainNotifications);
  } catch (cause) {
    logServerEvent(
      { event: "api_failure", kind: "ai_budget_settlement" },
      cause,
    );
  }
}

/** A refused start rolls back its owner transaction, so queue its alert afterward. */
export function observeBudgetLimit() {
  if (reportingEnvironment() !== "production") return;
  deferReporting(async () => {
    await reportingDb().begin(async (sql) => {
      const day = budgetDay(),
        state = await lockBudgetDay(sql, day);
      await budgetNotifications(sql, day, state, true);
    });
    await drainNotifications();
  });
}
