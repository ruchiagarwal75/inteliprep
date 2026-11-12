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
      create function auth.jwt() returns jsonb language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;
      create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.jwt(),auth.uid() to authenticated;
      create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),is_anonymous boolean default false,deleted_at timestamptz);
      `);
    for (const account of Object.values(fixtureAccounts))
      await operator`insert into auth.users(id,email) values (${account.id},${account.email})`;
    for (const name of [
      "20261106214658_interview_admin_reporting.sql",
      "20261108003142_reporting_least_privilege.sql",
      "20261109194452_practice_feedback.sql",
      "20261111073325_feedback_input_preference.sql",
      "20261109230144_short_interview_scoring.sql",
      "20261109231409_beta_funnel.sql",
      "20261108050628_beta_invitations.sql",
      "20261110072257_google_only_beta_invitations.sql",
      "20261111221816_play_game.sql",
      "20261112041345_play_stars_replays.sql",
      "20261112042654_play_chests.sql",
      "20261112044418_play_combos.sql",
    ])
      await operator.unsafe(
        readFileSync(resolve("supabase/migrations", name), "utf8"),
      );
    for (const [name, account] of Object.entries(fixtureAccounts))
      await operator`insert into interview_admin.beta_invites(email,approved) values (${account.email},${name !== "uninvited"})`;
    await operator.unsafe(
      "alter role mockmeai_reporting password 'ci-only-reporting-fixture'",
    );
  } catch (cause) {
    await pg.stop();
    throw cause;
  }
  let stopping;
  return {
    connection:
      "postgres://mockmeai_reporting:ci-only-reporting-fixture@127.0.0.1:55432/postgres",
    playAnswer: async (id) => {
      const [row] =
        await operator`select private_variant from practice_game.drill_attempts where id=${id}`;
      if (!row) throw Error("Missing fixture drill");
      const { definition: d, variant: v } = row.private_variant;
      if (d.type === "spot_flaw")
        return {
          type: d.type,
          option: String(v.order.indexOf(d.correctIndex)),
        };
      if (d.type === "pick_probe")
        return {
          type: d.type,
          text: "How does this mechanism fail, and what measured check blocks rollout?",
        };
      if (d.type === "tradeoff")
        return {
          type: d.type,
          decision: "Use a bounded check",
          reason: "Test the failure path against a labeled set before rollout.",
        };
      const stack = [];
      for (const t of d.math.expression) {
        if (typeof t === "number") stack.push(t);
        else if (typeof t === "object") stack.push(v.parameters[t.param]);
        else if (t === "ceil") stack.push(Math.ceil(stack.pop() - 1e-12));
        else {
          const b = stack.pop(),
            a = stack.pop();
          stack.push(t === "add" ? a + b : t === "multiply" ? a * b : a / b);
        }
      }
      return {
        type: d.type,
        value: stack[0] / d.math.units[0].factor,
        unit: d.math.units[0].id,
      };
    },
    isInvited: async (user) =>
      operator.begin(async (tx) => {
        await tx.unsafe("set local role authenticated");
        await tx`select set_config('request.jwt.claims',${JSON.stringify({ sub: user.id, email: user.email, app_metadata: user.app_metadata })},true)`;
        const [row] = await tx`select public.is_beta_invited() as approved`;
        return row.approved;
      }),
    setInvite: async (account, approved) => {
      await operator`update interview_admin.beta_invites set approved=${approved} where email=${account.email}`;
    },
    stop: () =>
      (stopping ??= (async () => {
        await operator.end({ timeout: 1 });
        await pg.stop();
      })()),
  };
}
