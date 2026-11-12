import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
try {
  process.loadEnvFile(".env.local");
} catch {
  /* Operator environment may already be set. */
}
let sql;
try {
  const connection = process.env.SUPABASE_CONNECTION_STRING;
  if (!connection) throw Error("configuration");
  sql = postgres(connection, {
    prepare: false,
    max: 1,
    connect_timeout: 8,
    ssl: {
      rejectUnauthorized: true,
      ca: readFileSync(
        new URL("../certificates/supabase-root-2021.crt", import.meta.url),
        "utf8",
      ),
    },
    onnotice: () => {},
  });
  if (!process.argv.includes("--verify"))
    await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtext('mockmeai_play_migration'))`;
      const [existing] =
        await tx`select to_regclass('practice_game.player_profiles') as present`;
      for (const name of readdirSync(
        new URL("../supabase/migrations", import.meta.url),
      )
        .filter((name) => name.includes("_play_") && name.endsWith(".sql"))
        .sort()) {
        if (existing.present && name === "20261111221816_play_game.sql")
          continue;
        await tx.unsafe(
          readFileSync(
            new URL(`../supabase/migrations/${name}`, import.meta.url),
            "utf8",
          ),
        );
      }
    });
  const rows =
    await sql`select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='practice_game' and c.relkind='r'`;
  if (rows.length < 11 || rows.some((row) => !row.relrowsecurity))
    throw Error("rls_verification");
  const [role] =
    await sql`select rolbypassrls,rolsuper from pg_roles where rolname='mockmeai_reporting'`;
  if (!role || role.rolbypassrls || role.rolsuper)
    throw Error("runtime_privileges");
  console.log(
    "Play schema verified: private tables with row security; runtime role has no RLS bypass.",
  );
} catch (cause) {
  console.error(
    JSON.stringify({
      operation: "play_migration",
      category: cause.code ?? "migration_failed",
    }),
  );
  process.exitCode = 1;
} finally {
  await sql?.end({ timeout: 1 });
}
