import { afterAll, beforeAll, expect, it, vi } from "vitest";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as other,
} from "./fixtures/play-postgres";
import { startRound, getRound, advanceRound } from "@/lib/play/rounds";
import { recordDrillActivity } from "@/lib/play/drill-activity";
import { submitRoundAnswer } from "@/lib/play/submit";
import {
  drillDefinitionSchema,
  drillVariantSchema,
} from "@/lib/play/definition";
import { mathFixture } from "@/lib/play/fixtures/drills";
import { calculateMath } from "@/lib/play/math";
let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => fixture.runtime }));
vi.mock("@/lib/play/content", () => ({
  drillsForTopic: () =>
    Array.from({ length: 8 }, (_, i) =>
      drillDefinitionSchema.parse({
        ...mathFixture,
        id: `clock-${i}`,
        level: 1,
      }),
    ),
}));
beforeAll(async () => {
  fixture = await startPlayPostgres();
}, 30000);
afterAll(async () => {
  await fixture?.close();
});
const start = () =>
  startRound(user, {
    requestId: crypto.randomUUID(),
    topic: "rag",
    mode: "level",
    level: 1,
    timeZone: "UTC",
  });
async function solve(id: string) {
  const [row] =
    await fixture.operator`select private_variant from practice_game.drill_attempts where id=${id}`;
  const d = drillDefinitionSchema.parse(row.private_variant.definition),
    v = drillVariantSchema.parse(row.private_variant.variant);
  if (d.type !== "math") throw Error("Expected math");
  return {
    type: "math" as const,
    value: calculateMath(d.math, v.parameters),
    unit: "GB",
  };
}
it("pauses across hidden time, survives refresh, caps time at three par lengths and freezes on submit", async () => {
  const started = await start(),
    view = await getRound(user, started.sessionId),
    id = view.question.attemptId;
  await expect(recordDrillActivity(other, id, 0, true)).rejects.toMatchObject({
    status: 404,
  });
  await fixture.operator`update practice_game.drill_attempts set active_since=now()-interval '5 seconds' where id=${id}`;
  const paused = await recordDrillActivity(user, id, 0, false);
  expect(paused.elapsedMs).toBeGreaterThanOrEqual(5000);
  await fixture.operator`update practice_game.play_sessions set last_activity_at=now()-interval '1 hour' where id=${started.sessionId}`;
  const resumed = await getRound(user, started.sessionId);
  expect(resumed.question.elapsedMs).toBe(paused.elapsedMs);
  expect(resumed.question.startedAt).toBe(view.question.startedAt);
  await fixture.operator`update practice_game.drill_attempts set active_elapsed_ms=269999,active_since=now()-interval '1 minute' where id=${id}`;
  const capped = await recordDrillActivity(user, id, 0, true);
  expect(capped.elapsedMs).toBe(270000);
  const answer = await solve(id),
    saved = await submitRoundAnswer(user, id, answer);
  expect(saved.result.timeMs).toBe(270000);
  await recordDrillActivity(user, id, 0, true);
  expect((await submitRoundAnswer(user, id, answer)).result).toEqual(
    saved.result,
  );
});
it("refreshes only unanswered snapshots after two hours and rejects an old tab's revision without duplicate rewards", async () => {
  const started = await start(); // Continue the open level after the previous test's saved answer.
  let view = await getRound(user, started.sessionId);
  if (view.status !== "graded") throw Error("Expected saved answer");
  view = await advanceRound(user, started.sessionId, view.question.attemptId);
  const [answered] =
    await fixture.operator`select * from practice_game.drill_attempts where session_id=${started.sessionId} and ordinal=0`;
  const beforeLedger =
    await fixture.operator`select * from practice_game.points_ledger where user_id=${user} order by id`;
  const oldAnswer = await solve(view.question.attemptId);
  await fixture.operator`update practice_game.play_sessions set last_activity_at=now()-interval '5 hours',created_at=now()-interval '5 hours' where id=${started.sessionId}`;
  await fixture.operator`update practice_game.drill_attempts set created_at=now()-interval '5 hours',started_at=case when started_at is null then null else now()-interval '5 hours' end,submitted_at=case when submitted_at is null then null else now()-interval '5 hours' end,active_since=null where session_id=${started.sessionId}`;
  // Preserve the answered row exactly as it is immediately before resume.
  const [kept] =
    await fixture.operator`select * from practice_game.drill_attempts where id=${answered.id}`;
  const refreshed = await getRound(user, started.sessionId);
  expect(refreshed.refreshed).toBe(true);
  expect(refreshed.question.revision).toBe(1);
  expect(refreshed.question.elapsedMs).toBe(0);
  expect((await getRound(user, started.sessionId)).question.revision).toBe(1);
  await expect(
    submitRoundAnswer(user, view.question.attemptId, oldAnswer, undefined, 0),
  ).rejects.toMatchObject({ status: 409 });
  expect(
    await fixture.operator`select * from practice_game.drill_attempts where id=${kept.id}`,
  ).toEqual([kept]);
  expect(
    await fixture.operator`select * from practice_game.points_ledger where user_id=${user} order by id`,
  ).toEqual(beforeLedger);
  const revisions =
    await fixture.operator`select variant_revision from practice_game.drill_attempts where session_id=${started.sessionId} and answer is null`;
  expect(revisions.every((r) => r.variant_revision === 1)).toBe(true);
  const next = await submitRoundAnswer(
    user,
    refreshed.question.attemptId,
    await solve(refreshed.question.attemptId),
    undefined,
    1,
  );
  expect(next.result.correct).toBe(true);
});
