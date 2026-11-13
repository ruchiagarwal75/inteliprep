import { afterAll, beforeAll, expect, it, vi } from "vitest";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as other,
} from "./fixtures/play-postgres";
import { completeCourseQuiz } from "./fixtures/course-round";
import { seeCourseSlide } from "@/lib/play/course/visits";
import { RAG_COURSE_NODES } from "@/lib/play/course/metadata";
let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => fixture.runtime }));
vi.mock("@/lib/play/written-grader", () => ({
  gradeWrittenAnswer: () => {
    throw Error("No model calls");
  },
}));
beforeAll(async () => {
  fixture = await startPlayPostgres();
}, 30000);
afterAll(async () => fixture?.close());
it("passes both new ten-question topics at eight or more correct, with unchanged reward rules", async () => {
  for (const level of [0, 1])
    await fixture.operator`insert into practice_game.level_progress(user_id,topic,level,status,best_stars,passed_at) values(${user},'rag-course',${level},'passed',3,now())`;
  for (const [level, slides, correct] of [
    [2, 13, 8],
    [3, 12, 9],
  ]) {
    for (let index = 0; index < slides; index++)
      await seeCourseSlide(user, level, index);
    const result = await completeCourseQuiz(
      fixture.operator,
      user,
      level,
      (index) => index < correct,
    );
    expect(result.summary).toMatchObject({
      level,
      total: 10,
      correct,
      passed: true,
      stars: 1,
      bonusPoints: 25,
    });
    expect(result.results.map((r) => r.points)).toEqual(
      level === 2
        ? [10, 10, 15, 15, 10, 10, 10, 10, 0, 0]
        : [10, 10, 15, 10, 10, 10, 15, 10, 10, 0],
    );
    expect(result.results.map((r) => r.comboBonus)).toEqual([
      0, 0, 5, 0, 10, 0, 0, 0, 0, 0,
    ]);
  }
});
it("a weaker new attempt cannot revoke an old pass, stars, timing or points", async () => {
  await fixture.operator`insert into practice_game.level_progress(user_id,topic,level,status,best_stars,best_score,passed_at) values(${other},'rag-course',2,'passed',3,1,'2026-11-01T00:00:00Z')`;
  await fixture.operator`insert into practice_game.course_visits(user_id,course_id,level,seen_through,last_viewed_index,completed_at) values(${other},'rag-course',2,4,4,'2026-11-01T00:00:00Z')`;
  await fixture.operator`insert into practice_game.points_ledger(id,user_id,delta,reason,ref_id) values(${crypto.randomUUID()},${other},88,'legacy-fixture','kept')`;
  const failed = await completeCourseQuiz(
    fixture.operator,
    other,
    2,
    (index) => index < 7,
  );
  expect(failed.summary).toMatchObject({
    total: 10,
    correct: 7,
    passed: false,
    stars: 0,
    bestStars: 3,
    replay: true,
    bonusPoints: 0,
  });
  const [row] =
    await fixture.operator`select status,best_stars,best_score,passed_at from practice_game.level_progress where user_id=${other} and topic='rag-course' and level=2`;
  expect(row.status).toBe("passed");
  expect(row.best_stars).toBe(3);
  expect(Number(row.best_score)).toBe(1);
  expect(row.passed_at.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  const [points] =
    await fixture.operator`select delta from practice_game.points_ledger where user_id=${other} and reason='legacy-fixture'`;
  expect(points.delta).toBe(88);
});
it("shows the authored time estimate on all three full topics", () => {
  expect(
    RAG_COURSE_NODES.filter((n) => n.level >= 1 && n.level <= 3).map((n) =>
      "minutes" in n ? n.minutes : undefined,
    ),
  ).toEqual([15, 15, 15]);
});
