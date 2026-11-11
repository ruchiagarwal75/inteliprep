import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { withPlayer, ensurePlayer } from "@/lib/play/database";
import { playerSnapshot, updatePlayer } from "@/lib/play/player";
let operator: ReturnType<typeof postgres>,
  runtime: ReturnType<typeof postgres>,
  pg: EmbeddedPostgres,
  dir: string;
vi.mock("@/lib/reporting-db", () => ({ reportingDb: () => runtime }));
const a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222";
beforeAll(async () => {
  const port = await new Promise<number>((resolve, reject) => {
    const s = createServer();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      if (!addr || typeof addr === "string") return reject(Error("No port"));
      s.close(() => resolve(addr.port));
    });
  });
  dir = await mkdtemp(join(tmpdir(), "mockmeai-play-"));
  pg = new EmbeddedPostgres({
    databaseDir: join(dir, "db"),
    user: "postgres",
    password: "test-only",
    port,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });
  await pg.initialise();
  await pg.start();
  operator = postgres(
    `postgres://postgres:test-only@127.0.0.1:${port}/postgres`,
    { max: 1, onnotice: () => {} },
  );
  await operator.unsafe(
    `create role anon; create role authenticated; create role mockmeai_reporting login password 'test-only' nobypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;grant usage on schema auth to authenticated;`,
  );
  await operator`insert into auth.users(id) values(${a}),(${b})`;
  await operator.unsafe(
    await readFile("supabase/migrations/20261111221816_play_game.sql", "utf8"),
  );
  runtime = postgres(
    `postgres://mockmeai_reporting:test-only@127.0.0.1:${port}/postgres`,
    { max: 2, onnotice: () => {} },
  );
  await withPlayer(a, (sql) => ensurePlayer(sql, a));
  await withPlayer(b, (sql) => ensurePlayer(sql, b));
}, 30000);
afterAll(async () => {
  await runtime?.end({ timeout: 1 });
  await operator?.end({ timeout: 1 });
  await pg?.stop();
  if (dir) await rm(dir, { recursive: true, force: true });
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
