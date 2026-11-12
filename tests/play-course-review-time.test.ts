import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
} from "./fixtures/play-postgres";
import { courseLesson, seeCourseSlide } from "@/lib/play/course/visits";
import { startRound, advanceRound } from "@/lib/play/rounds";
import { recordDrillActivity } from "@/lib/play/drill-activity";
import { submitRoundAnswer } from "@/lib/play/submit";
import { drillAnswerSchema } from "@/lib/play/public";
import {
  drillDefinitionSchema,
  drillVariantSchema,
} from "@/lib/play/definition";
let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => fixture.runtime }));
vi.mock("@/lib/play/written-grader", () => ({
  gradeWrittenAnswer: () => {
    throw Error("No model calls in a course quiz");
  },
}));
beforeAll(async () => {
  fixture = await startPlayPostgres();
  const lesson = await courseLesson(user, 1);
  for (let index = 0; index < lesson.slides.length; index++)
    await seeCourseSlide(user, 1, index);
}, 30000);
afterAll(async () => {
  vi.useRealTimers();
  await fixture?.close();
});
it("ignores late heartbeats and pauses while keeping server-owned time", async () => {
  const started = await startRound(user, {
    topic: "rag-course",
    mode: "level",
    level: 1,
    requestId: crypto.randomUUID(),
    timeZone: "UTC",
  });
  const id = started.view.question.attemptId;
  expect(started.view.question.activityOrder).toBe(0);
  await fixture.operator`update practice_game.drill_attempts set active_elapsed_ms=3000,active_since=null where id=${id}`;
  vi.useFakeTimers({ toFake: ["Date"] });
  try {
    const paused = await recordDrillActivity(user, id, 0, false, { order: 20 });
    vi.setSystemTime(Date.now() + 8000);
    expect(
      (await recordDrillActivity(user, id, 0, true, { order: 10 })).elapsedMs,
    ).toBe(paused.elapsedMs);
    const [row] =
      await fixture.operator`select active_since,activity_order from practice_game.drill_attempts where id=${id}`;
    expect(row.active_since).toBeNull();
    expect(Number(row.activity_order)).toBe(20);
    await recordDrillActivity(user, id, 0, true, { order: 21 });
    vi.setSystemTime(Date.now() + 2000);
    const stopped = await recordDrillActivity(user, id, 0, false, {
      order: 22,
    });
    expect(stopped.elapsedMs).toBe(5000);
    vi.setSystemTime(Date.now() + 8000);
    expect(
      (await recordDrillActivity(user, id, 0, true, { order: 21 })).elapsedMs,
    ).toBe(5000);
    expect(
      (await recordDrillActivity(user, id, 0, false, { order: 20 })).elapsedMs,
    ).toBe(5000);
  } finally {
    vi.useRealTimers();
  }
});
it("can rerun the additive migration without changing existing attempts", async () => {
  const before =
    await fixture.operator`select to_jsonb(a) as row from practice_game.drill_attempts a order by id`;
  const migration = await readFile(
    "supabase/migrations/20261112225318_play_activity_order.sql",
    "utf8",
  );
  await fixture.operator.unsafe(migration);
  await fixture.operator.unsafe(migration);
  expect(
    await fixture.operator`select to_jsonb(a) as row from practice_game.drill_attempts a order by id`,
  ).toEqual(before);
});
it("excludes repeated slide-reading pauses from answer time, stars and XP", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  try {
    const started = await startRound(user, {
      topic: "rag-course",
      mode: "level",
      level: 1,
      requestId: crypto.randomUUID(),
      timeZone: "UTC",
    });
    let view = started.view;
    for (let index = 0; index < 7; index++) {
      const id = view.question.attemptId;
      await fixture.operator`update practice_game.drill_attempts set active_elapsed_ms=30000,active_since=${new Date(Date.now() - 1000)} where id=${id}`;
      const paused = await recordDrillActivity(user, id, 0, false);
      expect(paused.elapsedMs).toBe(31000);
      vi.setSystemTime(Date.now() + 60000);
      expect((await recordDrillActivity(user, id, 0, false)).elapsedMs).toBe(
        paused.elapsedMs,
      );
      const [row] =
        await fixture.operator`select private_variant from practice_game.drill_attempts where id=${id}`;
      const drill = drillDefinitionSchema.parse(row.private_variant.definition),
        variant = drillVariantSchema.parse(row.private_variant.variant);
      if (drill.type !== "spot_flaw") throw Error("Expected course choice");
      const answer = drillAnswerSchema.parse({
        type: "spot_flaw",
        option: String(variant.order.indexOf(drill.correctIndex)),
      });
      const saved = await submitRoundAnswer(user, id, answer);
      expect(saved.result.timeMs).toBe(31000);
      if (index === 6)
        expect(saved.summary).toMatchObject({
          stars: 3,
          pointsEarned: 120,
          bonusPoints: 25,
        });
      else view = await advanceRound(user, started.sessionId, id);
    }
  } finally {
    vi.useRealTimers();
  }
});
