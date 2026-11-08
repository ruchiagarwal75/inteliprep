import postgres from "postgres";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
process.loadEnvFile(".env.local");
const sql = postgres(process.env.SUPABASE_REPORTING_CONNECTION_STRING, {
  prepare: false,
  max: 1,
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync("certificates/supabase-root-2021.crt", "utf8"),
  },
  onnotice: () => {},
});
class Rollback extends Error {}
try {
  await sql.begin(async (tx) => {
    const [role] =
      await tx`select current_user as name,rolsuper,rolcreaterole,rolcreatedb,rolbypassrls from pg_roles where rolname=current_user`;
    if (
      role.name !== "mockmeai_reporting" ||
      role.rolsuper ||
      role.rolcreaterole ||
      role.rolcreatedb ||
      role.rolbypassrls
    )
      throw Error("ROLE_PRIVILEGES");
    await tx`select id,email,created_at from interview_admin.registered_users limit 1`;
    const hash = randomBytes(32).toString("hex");
    await tx`insert into interview_admin.app_viewers(environment,visitor_hash,is_test) values ('permission-check',${hash},true)`;
    await tx`update interview_admin.app_viewers set is_test=true where environment='permission-check' and visitor_hash=${hash}`;
    for (const query of [
      "select encrypted_password from auth.users limit 0",
      "update auth.users set email=email where false",
      "delete from interview_admin.interviews where false",
      "create table interview_admin.forbidden_probe (id integer)",
    ]) {
      let denied = false;
      try {
        await tx.savepoint(async (check) => {
          await check.unsafe(query);
          throw Error("UNEXPECTED_PERMISSION");
        });
      } catch (cause) {
        if (cause.code === "42501") denied = true;
        else throw cause;
      }
      if (!denied) throw Error("UNEXPECTED_PERMISSION");
    }
    const other =
      await tx`select count(*)::int as count from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','storage','auth') and c.relkind in ('r','v','m') and (has_table_privilege(current_user,c.oid,'SELECT') or has_table_privilege(current_user,c.oid,'INSERT') or has_table_privilege(current_user,c.oid,'UPDATE') or has_table_privilege(current_user,c.oid,'DELETE'))`;
    if (other[0].count !== 0) throw Error("OTHER_TABLE_PRIVILEGES");
    throw new Rollback();
  });
} catch (cause) {
  if (cause instanceof Rollback)
    console.log(
      "Restricted role verified: reporting read/insert/update work; Auth secrets, unrelated table access, deletes and schema changes are denied. Test writes rolled back.",
    );
  else {
    console.error(
      JSON.stringify({
        event: "reporting_role_verification_failed",
        code:
          typeof cause?.code === "string" ? cause.code : "PERMISSION_ASSERTION",
      }),
    );
    process.exitCode = 1;
  }
} finally {
  await sql.end({ timeout: 2 });
}
