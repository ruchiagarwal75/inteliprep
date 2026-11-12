import { afterAll, beforeAll, expect, it, vi } from "vitest";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
} from "./fixtures/play-postgres";
import { seeCourseSlide } from "@/lib/play/course/visits";
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
}, 30000);
afterAll(async () => {
  vi.useRealTimers();
  await fixture?.close();
});
it("excludes repeated slide-reading pauses from answer time, stars and XP", async () => {
  for (let index = 0; index < 5; index++) await seeCourseSlide(user, 1, index);
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
