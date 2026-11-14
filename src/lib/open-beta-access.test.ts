import { beforeAll, afterAll, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import {
  startPlayPostgres,
  PLAY_TEST_USER,
} from "../../tests/fixtures/play-postgres";
let pg: Awaited<ReturnType<typeof startPlayPostgres>>;
beforeAll(async () => {
  pg = await startPlayPostgres({ baseOnly: true });
  await pg.operator.unsafe(`create schema interview_admin;
 create function auth.jwt() returns jsonb language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;
 grant execute on function auth.jwt() to authenticated;`);
  for (const name of [
    "20261108050628_beta_invitations.sql",
    "20261114015629_open_beta_access.sql",
  ])
    await pg.operator.unsafe(
      await readFile("supabase/migrations/" + name, "utf8"),
    );
}, 60000);
afterAll(async () => pg?.close());
async function allowed(email: string, provider = "google") {
  return pg.operator.begin(async (sql) => {
    await sql`set local role authenticated`;
    await sql`select set_config('request.jwt.claims',${JSON.stringify({ sub: PLAY_TEST_USER, email, app_metadata: { provider } })},true)`;
    const [row] = await sql`select public.is_beta_invited() as allowed`;
    return row.allowed;
  });
}
it("automatically allows new and previously pending Google accounts", async () => {
  expect(await allowed("new@example.test")).toBe(true);
  expect(await allowed("waiting@example.test")).toBe(true);
});
it("preserves explicit revocations across sign-ins and migration reruns", async () => {
  await pg.operator`insert into interview_admin.beta_invites(email,approved) values('blocked@example.test',false),('active@example.test',true)`;
  expect(await allowed("blocked@example.test")).toBe(false);
  expect(await allowed("active@example.test")).toBe(true);
  await pg.operator.unsafe(
    await readFile(
      "supabase/migrations/20261114015629_open_beta_access.sql",
      "utf8",
    ),
  );
  expect(await allowed("blocked@example.test")).toBe(false);
  await pg.operator`update interview_admin.beta_invites set approved=true where email='blocked@example.test'`;
  expect(await allowed("blocked@example.test")).toBe(true);
});
it("keeps provider and own-email restrictions, and denies anonymous RPC access", async () => {
  expect(await allowed("new@example.test", "email")).toBe(false);
  expect(await allowed("")).toBe(false);
  await expect(
    pg.operator.begin(async (sql) => {
      await sql`set local role anon`;
      return sql`select public.is_beta_invited()`;
    }),
  ).rejects.toThrow();
  await pg.operator.begin(async (sql) => {
    await sql`set local role authenticated`;
    await sql`select set_config('request.jwt.claims',${JSON.stringify({ sub: PLAY_TEST_USER, email: "new@example.test", app_metadata: { provider: "google" } })},true)`;
    expect(
      await sql`select email,approved from interview_admin.beta_invites`,
    ).toHaveLength(0);
  });
  await expect(
    pg.operator.begin(async (sql) => {
      await sql`set local role authenticated`;
      return sql`insert into interview_admin.beta_invites(email,approved) values('self@example.test',true)`;
    }),
  ).rejects.toThrow();
});
