import { afterAll, beforeAll, expect, it, vi } from "vitest";
import type postgres from "postgres";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
  PLAY_OTHER_USER as other,
} from "./fixtures/play-postgres";
import { withPlayer, ensurePlayer } from "@/lib/play/database";
import { dailyGoal } from "@/lib/play/daily-goal";
let fixture: Awaited<ReturnType<typeof startPlayPostgres>>,
  runtime: ReturnType<typeof postgres>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => runtime }));
beforeAll(async () => {
  fixture = await startPlayPostgres();
  runtime = fixture.runtime;
}, 30000);
afterAll(async () => fixture?.close());
it("uses a completed round in the player's calendar day, not visits or another player's round", async () => {
  await withPlayer(user, (sql) => ensurePlayer(sql, user));
  expect(await withPlayer(user, (sql) => dailyGoal(sql, user))).toBe(false);
  const id = crypto.randomUUID();
  await fixture.operator`insert into practice_game.play_sessions(id,user_id,request_id,topic,level,mode) values(${id},${user},${id},'rag',1,'level')`;
  expect(await withPlayer(user, (sql) => dailyGoal(sql, user))).toBe(false);
  await fixture.operator`update practice_game.play_sessions set completed_at=now() where id=${id}`;
  expect(await withPlayer(user, (sql) => dailyGoal(sql, user))).toBe(true);
  await withPlayer(other, (sql) => ensurePlayer(sql, other));
  expect(await withPlayer(other, (sql) => dailyGoal(sql, other))).toBe(false);
  // Choose a fixed-offset zone whose local clock is 1 to 2 hours after midnight.
  const [candidate] =
    await fixture.operator`select name from pg_timezone_names where name like 'Etc/GMT%' and extract(hour from now() at time zone name) between 1 and 2 limit 1`;
  expect(candidate?.name).toBeTruthy();
  await fixture.operator`update practice_game.player_profiles set time_zone=${String(candidate.name)} where user_id=${user}`;
  await fixture.operator`update practice_game.play_sessions set completed_at=now()-interval '3 hours' where id=${id}`;
  expect(await withPlayer(user, (sql) => dailyGoal(sql, user))).toBe(false);
  await fixture.operator`update practice_game.play_sessions set completed_at=now()-interval '30 minutes' where id=${id}`;
  expect(await withPlayer(user, (sql) => dailyGoal(sql, user))).toBe(true);
});
