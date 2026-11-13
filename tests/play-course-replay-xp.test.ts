import { afterAll, beforeAll, expect, it, vi } from "vitest";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
} from "./fixtures/play-postgres";
import { completeCourseQuiz } from "./fixtures/course-round";
import { seeCourseSlide } from "@/lib/play/course/visits";
import { startRound, advanceRound } from "@/lib/play/rounds";
import { submitRoundAnswer } from "@/lib/play/submit";
import {
  drillDefinitionSchema,
  drillVariantSchema,
} from "@/lib/play/definition";
import { drillAnswerSchema } from "@/lib/play/public";
import { gradeWrittenAnswer } from "@/lib/play/written-grader";
let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => fixture.runtime }));
vi.mock("@/lib/play/written-grader", () => ({
  gradeWrittenAnswer: vi.fn(() => {
    throw Error("No model calls");
  }),
}));
beforeAll(async () => {
  fixture = await startPlayPostgres();
}, 30000);
afterAll(async () => fixture?.close());
it("halves replay combos to 2 and 5, preserves historical awards, and caches retries", async () => {
  for (let i = 0; i < 10; i++) await seeCourseSlide(user, 0, i);
  const original = await completeCourseQuiz(
    fixture.operator,
    user,
    0,
    () => true,
  );
  const before =
    await fixture.operator`select * from practice_game.points_ledger where user_id=${user} order by id`;
  const replay = await completeCourseQuiz(
    fixture.operator,
    user,
    0,
    (i) => i !== 7,
  );
  expect(original.results.map((r) => r.comboBonus)).toEqual([
    0, 0, 5, 0, 10, 0, 0, 0,
  ]);
  expect(replay.results.map((r) => r.points)).toEqual([5, 5, 5, 5, 5, 5, 7, 0]);
  expect(replay.results.map((r) => r.comboBonus)).toEqual([
    0, 0, 2, 0, 5, 0, 0, 0,
  ]);
  expect(replay.summary).toMatchObject({
    replay: true,
    correct: 7,
    pointsEarned: 44,
    bonusPoints: 0,
  });
  const after =
    await fixture.operator`select * from practice_game.points_ledger where user_id=${user} order by id`;
  for (const row of before)
    expect(after.find((saved) => saved.id === row.id)).toEqual(row);
  expect(gradeWrittenAnswer).not.toHaveBeenCalled();
});
it("also halves a combo when reviewing questions from a passed topic", async () => {
  for (let i = 1; i <= 3; i++)
    await fixture.operator`insert into practice_game.review_queue(user_id,drill_id,topic,level,due_at,step) values(${user},${`rag-course-p-q${i}`},'rag-course',0,now()-interval '1 day',2) on conflict(user_id,drill_id) do update set due_at=excluded.due_at`;
  const round = await startRound(user, {
    topic: "rag-course",
    mode: "review",
    requestId: crypto.randomUUID(),
    timeZone: "UTC",
  });
  let view = round.view;
  expect(view.question.total).toBe(3);
  for (let i = 0; i < 3; i++) {
    const [row] =
      await fixture.operator`select private_variant from practice_game.drill_attempts where id=${view.question.attemptId}`;
    const drill = drillDefinitionSchema.parse(row.private_variant.definition);
    const variant = drillVariantSchema.parse(row.private_variant.variant);
    if (drill.type !== "spot_flaw") throw Error("Expected choice");
    const saved = await submitRoundAnswer(
      user,
      view.question.attemptId,
      drillAnswerSchema.parse({
        type: "spot_flaw",
        option: String(variant.order.indexOf(drill.correctIndex)),
      }),
    );
    expect(saved.result.points).toBe(5);
    expect(saved.result.comboBonus).toBe(i === 2 ? 2 : 0);
    if (i < 2)
      view = await advanceRound(user, round.sessionId, view.question.attemptId);
  }
});
