import { afterAll, beforeAll, expect, it, vi } from "vitest";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
} from "./fixtures/play-postgres";
import { completeCourseQuiz } from "./fixtures/course-round";
import { seeCourseSlide } from "@/lib/play/course/visits";
let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => fixture.runtime }));
beforeAll(async () => {
  fixture = await startPlayPostgres();
}, 30000);
afterAll(async () => fixture?.close());
it("awards RAG Rookie once on the first primer pass, never on a failure or a replay", async () => {
  for (let i = 0; i < 10; i++) await seeCourseSlide(user, 0, i);
  const failed = await completeCourseQuiz(
    fixture.operator,
    user,
    0,
    (i) => i < 5,
  );
  expect(failed.summary.earnedBadges).not.toContain("rag-rookie");
  const first = await completeCourseQuiz(fixture.operator, user, 0, () => true);
  expect(first.summary.earnedBadges).toContain("rag-rookie");
  expect(first.summary.bonusPoints).toBe(0);
  const before =
    await fixture.operator`select * from practice_game.badges where user_id=${user} and badge_id='rag-rookie'`;
  const replay = await completeCourseQuiz(
    fixture.operator,
    user,
    0,
    () => true,
  );
  expect(replay.summary.earnedBadges).not.toContain("rag-rookie");
  expect(
    await fixture.operator`select * from practice_game.badges where user_id=${user} and badge_id='rag-rookie'`,
  ).toEqual(before);
  expect(before).toHaveLength(1);
  const events =
    await fixture.operator`select id from practice_game.play_events where user_id=${user} and event='badge_earned' and ref_id='rag-rookie'`;
  expect(events).toHaveLength(1);
});
