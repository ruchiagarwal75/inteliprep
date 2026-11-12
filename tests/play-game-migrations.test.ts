import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import {
  startPlayPostgres,
  PLAY_TEST_USER as user,
} from "./fixtures/play-postgres";
import { getRound } from "@/lib/play/rounds";
import { playerSnapshot } from "@/lib/play/player";
import { mathFixture } from "@/lib/play/fixtures/drills";
import { createVariant } from "@/lib/play/question";
let fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => fixture.runtime }));
beforeAll(async () => {
  fixture = await startPlayPostgres({ baseOnly: true });
}, 30000);
afterAll(async () => {
  await fixture?.close();
});
it("adds game metadata twice without changing an old private attempt, timing, pass or ledger", async () => {
  const [oldColumns] =
    await fixture.operator`select count(*)::integer as count from information_schema.columns where table_schema='practice_game' and column_name='best_stars'`;
  expect(oldColumns.count).toBe(0);
  const round = crypto.randomUUID(),
    attempt = crypto.randomUUID(),
    variant = { definition: mathFixture, variant: createVariant(mathFixture) };
  await fixture.operator`insert into practice_game.player_profiles(user_id) values(${user})`;
  await fixture.operator`insert into practice_game.streaks(user_id) values(${user})`;
  await fixture.operator`insert into practice_game.play_sessions(id,user_id,request_id,topic,level,mode,created_at) values(${round},${user},${crypto.randomUUID()},'rag',1,'level','2026-11-01T12:00:00Z')`;
  await fixture.operator`insert into practice_game.drill_attempts(id,user_id,session_id,drill_id,topic,level,type,ordinal,private_variant,started_at) values(${attempt},${user},${round},${mathFixture.id},'rag',1,'math',0,${fixture.operator.json(variant)},'2026-11-01T12:00:00Z')`;
  await fixture.operator`insert into practice_game.level_progress(user_id,topic,level,status,best_score,passed_at) values(${user},'rag',1,'passed',1,'2026-11-01T12:00:00Z')`;
  await fixture.operator`insert into practice_game.points_ledger(id,user_id,delta,reason,ref_id) values(${crypto.randomUUID()},${user},75,'legacy','kept')`;
  const [before] =
    await fixture.operator`select * from practice_game.drill_attempts where id=${attempt}`;
  const names = (await readdir("supabase/migrations"))
    .filter((n) => /_play_(stars_replays|chests|combos)\.sql$/u.test(n))
    .sort();
  expect(names).toHaveLength(3);
  for (let repeat = 0; repeat < 2; repeat++)
    for (const name of names) {
      const sql = await readFile(`supabase/migrations/${name}`, "utf8");
      expect(sql).not.toMatch(/(?:^|\n)\s*(drop|delete|update|truncate)\s/iu);
      await fixture.operator.unsafe(sql);
    }
  const [after] =
    await fixture.operator`select * from practice_game.drill_attempts where id=${attempt}`;
  expect(after).toEqual(before);
  const state = await playerSnapshot(user);
  expect(state.points).toBe(75);
  expect(state.levels[0]).toMatchObject({ status: "passed", best_stars: 0 });
  expect(state.xpLevel?.level).toBe(1);
  expect(state.chests).toEqual([]);
  const restored = await getRound(user, round);
  expect(restored.question.attemptId).toBe(attempt);
  expect(restored.question.startedAt).toBe("2026-11-01T12:00:00.000Z");
  expect(restored.status).toBe("answering");
  const [metadata] =
    await fixture.operator`select replay,current_combo,best_combo from practice_game.play_sessions where id=${round}`;
  expect(metadata).toEqual({ replay: false, current_combo: 0, best_combo: 0 });
  const [permissions] =
    await fixture.operator`select has_table_privilege('authenticated','practice_game.chest_opens','INSERT') as chest_write,has_table_privilege('authenticated','practice_game.level_progress','UPDATE') as level_write`;
  expect(permissions).toEqual({ chest_write: false, level_write: false });
  const tables =
    await fixture.operator`select relrowsecurity from pg_class c join pg_namespace n on c.relnamespace=n.oid where n.nspname='practice_game' and c.relkind='r'`;
  expect(tables).toHaveLength(12);
  expect(tables.every((t) => t.relrowsecurity)).toBe(true);
});
