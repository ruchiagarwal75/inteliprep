import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ sql: vi.fn(), log: vi.fn() }));
vi.mock("@/lib/reporting-db", () => ({
  reportingConfigured: () => true,
  reportingDb: () => mocks.sql,
}));
vi.mock("@/lib/admin-config", () => ({ reportingEnvironment: () => "test" }));
vi.mock("@/lib/server-events", () => ({ logServerEvent: mocks.log }));
import { checkDailyAiSpend } from "./spend";
it("logs the known cost as a lower bound and keeps unknown usage visible", async () => {
  mocks.sql.mockResolvedValue([{ known_cost: "6", unknown_calls: 2 }]);
  await checkDailyAiSpend();
  await checkDailyAiSpend();
  expect(mocks.sql).toHaveBeenCalledTimes(1);
  expect(mocks.log).toHaveBeenCalledWith(
    expect.objectContaining({
      event: "play_spend_threshold",
      kind: "known_cost_lower_bound",
      estimatedCostUsd: 6,
      unknownUsageCalls: 2,
    }),
  );
});
