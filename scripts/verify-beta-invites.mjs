import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
process.loadEnvFile(".env.local");
const sql = postgres(process.env.SUPABASE_CONNECTION_STRING, {
  prepare: false,
  max: 1,
  connect_timeout: 8,
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync("certificates/supabase-root-2021.crt", "utf8"),
  },
  onnotice: () => {},
});
class Rollback extends Error {}
async function denied(tx, work) {
  try {
    await tx.savepoint(async (check) => {
      await work(check);
      throw Error("UNEXPECTED_PERMISSION");
    });
  } catch (error) {
    if (error.code === "42501") return;
    throw error;
  }
}
let stage = "schema";
try {
  await sql.begin(async (tx) => {
    const first = randomUUID() + "@example.invalid";
    const second = randomUUID() + "@example.invalid";
    await tx`insert into interview_admin.beta_invites (email,approved) values (${first},true),(${second},true)`;
    const [fn] =
      await tx`select prosecdef from pg_proc where oid='public.is_beta_invited()'::regprocedure`;
    if (fn.prosecdef) throw Error("DEFINER_NOT_ALLOWED");
    const userId = randomUUID();
    const checkMembership = async (email, expected) =>
      tx.savepoint(async (user) => {
        await user`set local role authenticated`;
        await user`select set_config('request.jwt.claims',${JSON.stringify({ sub: userId, email, role: "authenticated", user_metadata: { email: second } })},true)`;
        const [result] = await user`select public.is_beta_invited() as allowed`;
        if (result.allowed !== expected) throw Error("INCORRECT_MEMBERSHIP");
        const own = await user`select email from interview_admin.beta_invites`;
        if (
          own.length !==
          (email.toLowerCase() === first || email === second ? 1 : 0)
        )
          throw Error("RLS_SCOPE");
        await denied(
          user,
          (q) => q`select updated_by from interview_admin.beta_invites`,
        );
        await denied(
          user,
          (q) => q`select * from interview_admin.interviews limit 0`,
        );
        await denied(
          user,
          (q) =>
            q`update interview_admin.beta_invites set approved=true where email=${first}`,
        );
        await denied(
          user,
          (q) =>
            q`insert into interview_admin.beta_invites(email,approved) values ('forbidden@example.invalid',true)`,
        );
        await user`reset role`;
      });
    stage = "authenticated-membership";
    await checkMembership(first.toUpperCase(), true);
    await checkMembership(randomUUID() + "@example.invalid", false);
    await tx`update interview_admin.beta_invites set approved=false where email=${first}`;
    stage = "revocation";
    await checkMembership(first, false);
    stage = "anonymous-denial";
    await tx.savepoint(async (anon) => {
      await anon`set local role anon`;
      await denied(anon, (q) => q`select public.is_beta_invited()`);
      await denied(
        anon,
        (q) => q`select email from interview_admin.beta_invites`,
      );
      await anon`reset role`;
    });
    throw new Rollback();
  });
} catch (error) {
  if (error instanceof Rollback)
    console.log(
      "Verified live DB: own-email RLS, invoker-only RPC, approval/revocation and anonymous/candidate write denials. All fixtures rolled back.",
    );
  else {
    console.error(
      JSON.stringify({
        event: "invite_verification_failed",
        stage,
        routine: error.routine,
        code: /^[A-Z0-9_]{2,40}$/.test(error.code ?? "")
          ? error.code
          : error.message === "UNEXPECTED_PERMISSION"
            ? error.message
            : "ASSERTION_FAILED",
      }),
    );
    process.exitCode = 1;
  }
} finally {
  await sql.end({ timeout: 2 });
}
if (!process.exitCode) {
  const runtime = postgres(process.env.SUPABASE_REPORTING_CONNECTION_STRING, {
    prepare: false,
    max: 1,
    connect_timeout: 8,
    ssl: {
      rejectUnauthorized: true,
      ca: readFileSync("certificates/supabase-root-2021.crt", "utf8"),
    },
    onnotice: () => {},
  });
  try {
    await runtime.begin(async (tx) => {
      const email = randomUUID() + "@example.invalid";
      await tx`insert into interview_admin.beta_invites(email,approved) values (${email},true)`;
      const [original] =
        await tx`select created_at::text as started from interview_admin.beta_invites where email=${email}`;
      await tx`insert into interview_admin.beta_invites(email,approved) values (${email},false)
        on conflict(email) do update set approved=excluded.approved,updated_at=now()`;
      const [row] =
        await tx`select count(*)::int as count,min(created_at)::text as started,bool_or(approved) as approved from interview_admin.beta_invites where email=${email}`;
      if (row.count !== 1 || row.started !== original.started || row.approved)
        throw Error("UPSERT_FAILED");
      await denied(
        tx,
        (q) => q`delete from interview_admin.beta_invites where email=${email}`,
      );
      throw new Rollback();
    });
  } catch (error) {
    if (error instanceof Rollback)
      console.log(
        "Restricted runtime role verified: invitation read/insert/update work; DELETE denied; repeat approval uses one row. Fixtures rolled back.",
      );
    else {
      console.error(
        JSON.stringify({
          event: "invite_runtime_verification_failed",
          code: error.code ?? "ASSERTION_FAILED",
        }),
      );
      process.exitCode = 1;
    }
  } finally {
    await runtime.end({ timeout: 2 });
  }
}
