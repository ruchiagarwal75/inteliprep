import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
export const PLAY_TEST_USER = "11111111-1111-4111-8111-111111111111";
export const PLAY_OTHER_USER = "22222222-2222-4222-8222-222222222222";
/** Actual SQL/RLS, with synthetic users and no external credentials or services. */
export async function startPlayPostgres({
  baseOnly = false,
  legacyCourse = false,
}: { baseOnly?: boolean; legacyCourse?: boolean } = {}) {
  const port = await new Promise<number>((resolve, reject) => {
    const s = createServer();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      if (!addr || typeof addr === "string") return reject(Error("No port"));
      s.close(() => resolve(addr.port));
    });
  });
  const dir = await mkdtemp(join(tmpdir(), "mockmeai-play-"));
  const pg = new EmbeddedPostgres({
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
  const operator = postgres(
    `postgres://postgres:test-only@127.0.0.1:${port}/postgres`,
    { max: 1, onnotice: () => {} },
  );
  try {
    await operator.unsafe(
      `create role anon; create role authenticated; create role mockmeai_reporting login password 'test-only' nobypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;grant usage on schema auth to authenticated;`,
    );
    await operator`insert into auth.users(id) values(${PLAY_TEST_USER}),(${PLAY_OTHER_USER})`;
    for (const name of (await readdir("supabase/migrations"))
      .filter(
        (name) =>
          name.includes("_play_") &&
          name.endsWith(".sql") &&
          (!baseOnly || name === "20261111221816_play_game.sql"),
      )
      .sort())
      await operator.unsafe(
        await readFile(`supabase/migrations/${name}`, "utf8"),
      );
    if (legacyCourse && !baseOnly)
      for (const user of [PLAY_TEST_USER, PLAY_OTHER_USER])
        await operator`insert into practice_game.level_progress(user_id,topic,level,status) values(${user},'rag-course',1,'open') on conflict do nothing`;
  } catch (cause) {
    await operator.end({ timeout: 1 });
    await pg.stop();
    await rm(dir, { recursive: true, force: true });
    throw cause;
  }
  const runtime = postgres(
    `postgres://mockmeai_reporting:test-only@127.0.0.1:${port}/postgres`,
    { max: 2, onnotice: () => {} },
  );
  return {
    operator,
    runtime,
    async close() {
      await runtime.end({ timeout: 1 });
      await operator.end({ timeout: 1 });
      await pg.stop();
      await rm(dir, { recursive: true, force: true });
    },
  };
}
