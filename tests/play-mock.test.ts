import { afterAll, beforeAll, expect, it, vi } from "vitest";
import type postgres from "postgres";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
} from "./fixtures/play-postgres";
import { scorecardFixture } from "@/lib/fixtures/scorecard-test";
import { withPlayer } from "@/lib/play/database";
import { applyMockOutcome } from "@/lib/play/mock-hooks";
import { ageReadiness } from "@/lib/play/readiness-store";
let db: Awaited<ReturnType<typeof startPlayPostgres>>,
  runtime: ReturnType<typeof postgres>;
vi.mock("@/lib/reporting-db", () => ({
  reportingDb: () => runtime,
  reportingConfigured: () => false,
}));
beforeAll(async () => {
  db = await startPlayPostgres();
  runtime = db.runtime;
}, 30000);
afterAll(async () => {
  await db?.close();
});
it("awards once from a trusted RAG result, not from client input or refreshes", async () => {
  const card = {
    ...scorecardFixture(),
    problemId: "enterprise-rag-assistant",
    level: "senior" as const,
    session: {
      startedAt: "2026-11-11T00:00:00.000Z",
      elapsedSeconds: 2700,
      allowedSeconds: 2700,
      limited: false,
      note: "Complete",
    },
  };
  const id = crypto.randomUUID();
  await withPlayer(user, (sql) => applyMockOutcome(sql, user, id, card));
  await withPlayer(user, (sql) => applyMockOutcome(sql, user, id, card));
  const [points] =
    await db.operator`select sum(delta) as total from practice_game.points_ledger`;
  expect(Number(points.total)).toBe(75);
  const [ready] =
    await db.operator`select * from practice_game.topic_readiness`;
  expect(ready.state).toBe("interview_ready");
  expect(ready.verified_level).toBe("senior");
  expect(
    await db.operator`select * from practice_game.streaks where current>0`,
  ).toHaveLength(0);
  await db.operator`update practice_game.topic_readiness set last_activity_at=now()-interval '22 days'`;
  await withPlayer(user, (sql) => ageReadiness(sql, user));
  await withPlayer(user, (sql) => applyMockOutcome(sql, user, id, card));
  const [expired] =
    await db.operator`select state from practice_game.topic_readiness`;
  expect(expired.state).toBe("practice_ready");
  const other = { ...card, problemId: "url-shortener" };
  await withPlayer(user, (sql) =>
    applyMockOutcome(sql, user, crypto.randomUUID(), other),
  );
  expect(
    await db.operator`select * from practice_game.points_ledger`,
  ).toHaveLength(2);
});
