import { beforeAll, afterAll, expect, it, vi } from "vitest";
import type postgres from "postgres";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as other,
} from "./fixtures/play-postgres";
import { withPlayer } from "@/lib/play/database";
import { reserveAiGrade } from "@/lib/play/ai-usage";
import { recordPlayEvent } from "@/lib/play/events";
let db: Awaited<ReturnType<typeof startPlayPostgres>>,
  runtime: ReturnType<typeof postgres>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => runtime }));
beforeAll(async () => {
  db = await startPlayPostgres();
  runtime = db.runtime;
}, 30000);
afterAll(async () => db?.close());
it("enforces 150 reservations across concurrent requests, resets by UTC day and isolates users", async () => {
  const now = new Date("2026-11-11T23:59:50Z");
  await db.operator`insert into practice_game.daily_ai_usage(user_id,day,calls) values(${user},'2026-11-11',149)`;
  const results = await Promise.allSettled([
    withPlayer(user, (sql) => reserveAiGrade(sql, user, now)),
    withPlayer(user, (sql) => reserveAiGrade(sql, user, now)),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  await expect(
    withPlayer(user, (sql) => reserveAiGrade(sql, user, now)),
  ).rejects.toMatchObject({ status: 429, retryAfter: 10 });
  expect(
    await withPlayer(other, (sql) => reserveAiGrade(sql, other, now)),
  ).toBe(1);
  expect(
    await withPlayer(user, (sql) =>
      reserveAiGrade(sql, user, new Date("2026-11-12T00:00:00Z")),
    ),
  ).toBe(1);
});
it("deduplicates analytics retries and keeps a transaction usable after tracking fails", async () => {
  await withPlayer(user, async (sql) => {
    await recordPlayEvent(sql, user, "drill_submitted", "test", {
      topic: "rag",
      type: "math",
      correct: true,
      timeMs: 100,
    });
    await recordPlayEvent(sql, user, "drill_submitted", "test", {
      topic: "rag",
      type: "math",
      correct: true,
      timeMs: 100,
    });
    await recordPlayEvent(sql, other, "drill_submitted", "forbidden");
    expect(await sql`select 1 as ok`).toHaveLength(1);
  });
  expect(
    await db.operator`select * from practice_game.play_events where ref_id='test'`,
  ).toHaveLength(1);
});
