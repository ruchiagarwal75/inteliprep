import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as other,
} from "./fixtures/play-postgres";
import {
  courseLesson,
  seeCourseSlide,
  startedCourseLevels,
} from "@/lib/play/course/visits";
import { playerSnapshot } from "@/lib/play/player";
let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => fixture.runtime }));
beforeAll(async () => {
  fixture = await startPlayPostgres();
}, 30000);
afterAll(async () => fixture?.close());
it("remembers backward reading without reducing completion or changing earned progress", async () => {
  for (let index = 0; index < 5; index++) await seeCourseSlide(user, 1, index);
  const before =
    await fixture.operator`select * from practice_game.course_visits where user_id=${user}`;
  await seeCourseSlide(user, 1, 4, 1);
  const lesson = await courseLesson(user, 1);
  expect(lesson).toMatchObject({
    seenThrough: 4,
    lastViewedIndex: 1,
    complete: true,
  });
  expect(JSON.stringify(lesson)).not.toMatch(
    /"(?:correctIndex|questions|keyIdea|ifWrong)":/,
  );
  expect((await courseLesson(other, 1)).lastViewedIndex).toBe(0);
  const [row] =
    await fixture.operator`select completed_at from practice_game.course_visits where user_id=${user}`;
  expect(row.completed_at).toEqual(before[0].completed_at);
  expect(await startedCourseLevels(user)).toEqual([1]);
  expect((await playerSnapshot(user)).points).toBe(0);
});
it("preserves older positions and owner policies when the migration is rerun", async () => {
  await fixture.operator`insert into practice_game.course_visits(user_id,course_id,level,seen_through,completed_at) values(${other},'rag-course',1,4,now())`;
  expect(await courseLesson(other, 1)).toMatchObject({
    seenThrough: 4,
    lastViewedIndex: 4,
    complete: true,
  });
  const before =
    await fixture.operator`select * from practice_game.course_visits order by user_id`;
  await fixture.operator.unsafe(
    readFileSync(
      "supabase/migrations/20261112212130_play_course_slide_positions.sql",
      "utf8",
    ),
  );
  expect(
    await fixture.operator`select * from practice_game.course_visits order by user_id`,
  ).toEqual(before);
  const [privilege] =
    await fixture.operator`select has_column_privilege('authenticated','practice_game.course_visits','last_viewed_index','UPDATE') as update`;
  expect(privilege.update).toBe(false);
});
