import "server-only";
import { requireAdminIdentity } from "@/lib/admin-auth";
import { reportingDb } from "@/lib/reporting-db";
import { AI_BUDGET } from "@/lib/ai-budget-config";
import { budgetDay, readBudgetTotals } from "@/lib/ai-budget-store";
export async function adminAiBudget() {
  await requireAdminIdentity();
  const day = budgetDay();
  const state = await reportingDb().begin("read only", (sql) =>
    readBudgetTotals(sql, day),
  );
  return {
    day,
    ...state,
    cap: AI_BUDGET.capUsd,
    warning: AI_BUDGET.warningUsd,
    remaining: Math.max(
      0,
      AI_BUDGET.capUsd - state.spent - state.uncertain - state.held,
    ),
  };
}
