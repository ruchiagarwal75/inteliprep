import postgres from "postgres";
import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { withPlayer, ensurePlayer } from "@/lib/play/database";
import { playerSnapshot, updatePlayer } from "@/lib/play/player";
import {
  startPlayPostgres,
  PLAY_TEST_USER as a,
  PLAY_OTHER_USER as b,
} from "./fixtures/play-postgres";
let operator: ReturnType<typeof postgres>,
  runtime: ReturnType<typeof postgres>,
  fixture: Awaited<ReturnType<typeof startPlayPostgres>>;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => runtime }));
beforeAll(async () => {
  fixture = await startPlayPostgres();
  operator = fixture.operator;
  runtime = fixture.runtime;
  await withPlayer(a, (sql) => ensurePlayer(sql, a));
  await withPlayer(b, (sql) => ensurePlayer(sql, b));
}, 30000);
afterAll(async () => {
  await fixture?.close();
});
it("keeps rows private and rejects cross-account writes", async () => {
  expect(
    await withPlayer(
      a,
      (sql) =>
        sql`select * from practice_game.player_profiles where user_id=${b}`,
    ),
  ).toHaveLength(0);
  await expect(
    withPlayer(
      a,
      (sql) =>
        sql`insert into practice_game.points_ledger(id,user_id,delta,reason,ref_id) values(${crypto.randomUUID()},${b},100,'test','foreign')`,
    ),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(
    withPlayer(
      a,
      (sql) =>
        sql`update practice_game.player_profiles set user_id=${b} where user_id=${a}`,
    ),
  ).rejects.toMatchObject({ code: "42501" });
});
it("prevents browser roles editing earned outcomes or reading private variants", async () => {
  await expect(
    operator.begin(async (sql) => {
      await sql.unsafe("set local role authenticated");
      await sql`select set_config('request.jwt.claims',${JSON.stringify({ sub: a })},true)`;
      return sql`insert into practice_game.points_ledger(id,user_id,delta,reason,ref_id) values(${crypto.randomUUID()},${a},100,'test','browser')`;
    }),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(
    operator.begin(async (sql) => {
      await sql.unsafe("set local role authenticated");
      await sql`select set_config('request.jwt.claims',${JSON.stringify({ sub: a })},true)`;
      return sql`select private_variant from practice_game.drill_attempts`;
    }),
  ).rejects.toMatchObject({ code: "42501" });
  const rows = await operator.begin(async (sql) => {
    await sql.unsafe("set local role authenticated");
    await sql`select set_config('request.jwt.claims',${JSON.stringify({ sub: a })},true)`;
    return sql`select user_id from practice_game.player_profiles`;
  });
  expect(rows.map((r) => r.user_id)).toEqual([a]);
});
it("preserves profile, timing and ledger totals across refreshes and duplicate references", async () => {
  const [first] = await withPlayer(
    a,
    (sql) => sql`select created_at from practice_game.player_profiles`,
  );
  for (let i = 0; i < 2; i++)
    await withPlayer(
      a,
      (sql) =>
        sql`insert into practice_game.points_ledger(id,user_id,delta,reason,ref_id) values(${crypto.randomUUID()},${a},20,'test','once') on conflict(user_id,reason,ref_id) do nothing`,
    );
  await updatePlayer(a, { timeZone: "America/Los_Angeles", level: "staff" });
  await updatePlayer(a, { timeZone: "Asia/Tokyo" });
  const state = await playerSnapshot(a),
    [last] = await withPlayer(
      a,
      (sql) => sql`select created_at from practice_game.player_profiles`,
    );
  expect(state).toMatchObject({
    points: 20,
    streak: 0,
    timeZone: "America/Los_Angeles",
    level: "staff",
  });
  expect(last.created_at).toEqual(first.created_at);
  expect((await playerSnapshot(b)).points).toBe(0);
});
