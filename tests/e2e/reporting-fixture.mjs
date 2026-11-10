import { fixtureAccounts } from "./fixture-accounts.mjs";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { readFileSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";

// Real SQL and the production RLS policies, isolated from Supabase and saved interviews.
export async function startReportingFixture(key, cert) {
  const pg = new EmbeddedPostgres({
    databaseDir: resolve(".playwright-e2e", `db-${randomUUID()}`),
    user: "postgres",
    password: "ci-only-database-fixture",
    port: 55432,
    persistent: false,
    postgresFlags: [
      "-h",
      "127.0.0.1",
      "-c",
      "ssl=on",
      "-c",
      `ssl_cert_file=${cert}`,
      "-c",
      `ssl_key_file=${key}`,
    ],
    onLog: (message) =>
      appendFileSync(
        resolve(".playwright-e2e/postgres.log"),
        String(message) + "\n",
      ),
    onError: (message) =>
      appendFileSync(
        resolve(".playwright-e2e/postgres.log"),
        String(message) + "\n",
      ),
  });
  await pg.initialise();
  await pg.start();
  const operator = postgres(
    "postgres://postgres:ci-only-database-fixture@127.0.0.1:55432/postgres",
    {
      prepare: false,
      max: 1,
      ssl: { rejectUnauthorized: true, ca: readFileSync(cert, "utf8") },
      onnotice: () => {},
    },
  );
  try {
    await operator.unsafe(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),is_anonymous boolean default false,deleted_at timestamptz);
      `);
    for (const account of Object.values(fixtureAccounts))
      await operator`insert into auth.users(id,email) values (${account.id},${account.email})`;
    for (const name of [
      "20261106214658_interview_admin_reporting.sql",
      "20261108003142_reporting_least_privilege.sql",
      "20261109194452_practice_feedback.sql",
      "20261109230144_short_interview_scoring.sql",
      "20261109231409_beta_funnel.sql",
    ])
      await operator.unsafe(
        readFileSync(resolve("supabase/migrations", name), "utf8"),
      );
    await operator.unsafe(
      "alter role mockmeai_reporting password 'ci-only-reporting-fixture'",
    );
  } catch (cause) {
    await pg.stop();
    throw cause;
  } finally {
    await operator.end({ timeout: 1 });
  }
  let stopping;
  return {
    connection:
      "postgres://mockmeai_reporting:ci-only-reporting-fixture@127.0.0.1:55432/postgres",
    stop: () => (stopping ??= pg.stop()),
  };
}
