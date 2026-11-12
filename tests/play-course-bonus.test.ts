import { afterAll, beforeAll, expect, it, vi } from "vitest";
import {
  startPlayPostgres,
  PLAY_TEST_USER as returning,
  PLAY_OTHER_USER as fresh,
} from "./fixtures/play-postgres";
import { courseLesson, seeCourseSlide } from "@/lib/play/course/visits";
import { startRound, advanceRound } from "@/lib/play/rounds";
import { submitRoundAnswer } from "@/lib/play/submit";
import {
  drillDefinitionSchema,
  drillVariantSchema,
} from "@/lib/play/definition";
import { drillAnswerSchema } from "@/lib/play/public";

let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => fixture.runtime }));
vi.mock("@/lib/play/written-grader", () => ({
  gradeWrittenAnswer: () => {
    throw Error("A course quiz must not call a model");
  },
}));
beforeAll(async () => {
  fixture = await startPlayPostgres();
}, 30000);
afterAll(async () => fixture?.close());

async function finish(user: string, passing: boolean) {
  for (
    let index = 0;
    index < (await courseLesson(user, 1)).slides.length;
    index++
  )
    await seeCourseSlide(user, 1, index);
  const round = await startRound(user, {
    topic: "rag-course",
    mode: "level",
    level: 1,
    requestId: crypto.randomUUID(),
    timeZone: "UTC",
  });
  let view = round.view;
  for (let index = 0; index < 7; index++) {
    const [row] =
      await fixture.operator`select private_variant from practice_game.drill_attempts where id=${view.question.attemptId}`;
    const drill = drillDefinitionSchema.parse(row.private_variant.definition);
    const variant = drillVariantSchema.parse(row.private_variant.variant);
    if (drill.type !== "spot_flaw") throw Error("Expected course choices");
    const correct = passing ? index !== 4 : index < 3;
    const answer = drillAnswerSchema.parse({
      type: "spot_flaw",
      option: String(
        variant.order.indexOf(
          correct ? drill.correctIndex : (drill.correctIndex + 1) % 4,
        ),
      ),
    });
    const saved = await submitRoundAnswer(
      user,
      view.question.attemptId,
      answer,
    );
    expect(
      await submitRoundAnswer(user, view.question.attemptId, answer),
    ).toEqual(saved);
    if (index === 6) return saved.summary;
    view = await advanceRound(user, round.sessionId, view.question.attemptId);
  }
  throw Error("No course result");
}

it("does not award the first-attempt bonus after a failed 3/7 attempt", async () => {
  expect(await finish(returning, false)).toMatchObject({
    correct: 3,
    passed: false,
    bonusPoints: 0,
  });
  expect(await finish(returning, true)).toMatchObject({
    correct: 6,
    passed: true,
    bonusPoints: 0,
    pointsEarned: 70,
  });
  const ledger =
    await fixture.operator`select delta from practice_game.points_ledger where user_id=${returning} and reason='first-level-pass'`;
  expect(ledger).toHaveLength(0);
});

it("awards +25 only for a passing first attempt and never again on replay or retry", async () => {
  expect(await finish(fresh, true)).toMatchObject({
    correct: 6,
    passed: true,
    bonusPoints: 25,
    pointsEarned: 95,
  });
  expect(await finish(fresh, true)).toMatchObject({
    passed: true,
    bonusPoints: 0,
  });
  const ledger =
    await fixture.operator`select delta from practice_game.points_ledger where user_id=${fresh} and reason='first-level-pass'`;
  expect(ledger.map((row) => row.delta)).toEqual([25]);
});
