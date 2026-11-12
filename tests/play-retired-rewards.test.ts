import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { ensurePlayer, withPlayer } from "@/lib/play/database";
import { playerSnapshot } from "@/lib/play/player";
import { playerTotals } from "@/lib/play/totals";
import { grantPoints } from "@/lib/play/rewards";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as other,
} from "./fixtures/play-postgres";

let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => fixture.runtime }));
beforeAll(async () => {
  fixture = await startPlayPostgres();
  await withPlayer(user, (sql) => ensurePlayer(sql, user));
}, 30000);
afterAll(async () => fixture?.close());

it("counts all retired and current rewards without changing badges or the streak", async () => {
  await fixture.operator`insert into practice_game.points_ledger(id,user_id,delta,reason,ref_id) values
    (${crypto.randomUUID()},${user},277,'drill','retired-drill-no-longer-in-the-catalog'),
    (${crypto.randomUUID()},${user},70,'drill','rag-course-current'),
    (${crypto.randomUUID()},${other},999,'drill','other-account')`;
  await fixture.operator`insert into practice_game.badges(user_id,badge_id) values(${user},'first-level')`;
  await fixture.operator`update practice_game.streaks set current=2,longest=2,last_active_date=current_date,last_resolved_date=current_date where user_id=${user}`;
  const before =
    await fixture.operator`select * from practice_game.badges where user_id=${user}`;
  for (let refresh = 0; refresh < 2; refresh++) {
    const snapshot = await playerSnapshot(user);
    expect(snapshot).toMatchObject({
      points: 347,
      streak: 2,
      xpLevel: { level: 3 },
    });
    expect(snapshot.badges.map((badge) => badge.badge_id)).toEqual([
      "first-level",
    ]);
    expect(
      await withPlayer(user, (sql) => playerTotals(sql, user)),
    ).toMatchObject({
      points: 347,
      streak: 2,
      xpLevel: { level: 3 },
    });
  }
  expect(
    await fixture.operator`select * from practice_game.badges where user_id=${user}`,
  ).toEqual(before);
});

it("adds a compensating reward once without changing existing ledger history", async () => {
  const before =
    await fixture.operator`select * from practice_game.points_ledger order by id`;
  for (let retry = 0; retry < 2; retry++)
    await withPlayer(user, (sql) =>
      grantPoints(
        sql,
        user,
        277,
        "progress-restoration",
        "explicit-reset-test",
      ),
    );
  const restored =
    await fixture.operator`select * from practice_game.points_ledger where user_id=${user} and reason='progress-restoration'`;
  expect(restored).toHaveLength(1);
  expect(restored[0].delta).toBe(277);
  expect(
    await fixture.operator`select * from practice_game.points_ledger where reason<>'progress-restoration' order by id`,
  ).toEqual(before);
});
