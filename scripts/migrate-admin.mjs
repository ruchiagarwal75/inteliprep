import postgres from "postgres";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* Deploy tooling can provide environment variables directly. */
}
let sql;
try {
  const connection = process.env.SUPABASE_CONNECTION_STRING;
  if (!connection) throw new Error("missing_configuration");
  new URL(connection); // Errors are sanitized below; never print the URI.
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
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('inteliprep_admin_reporting_migration'))`;
    const rows =
      await tx`select to_regclass('interview_admin.reporting_state') as existing`;
    if (!rows[0]?.existing) {
      const initial = new URL(
        "../supabase/migrations/20261106214658_interview_admin_reporting.sql",
        import.meta.url,
      );
      await tx.unsafe(readFileSync(fileURLToPath(initial), "utf8"));
      console.log("Installed the private reporting schema.");
    }
    const viewers = new URL(
      "../supabase/migrations/20261107221500_app_viewer_reporting.sql",
      import.meta.url,
    );
    await tx.unsafe(readFileSync(fileURLToPath(viewers), "utf8"));
    await tx.unsafe(
      readFileSync(
        new URL(
          "../supabase/migrations/20261108003142_reporting_least_privilege.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await tx.unsafe(
      readFileSync(
        new URL(
          "../supabase/migrations/20261108050628_beta_invitations.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await tx.unsafe(
      readFileSync(
        new URL(
          "../supabase/migrations/20261109011503_beta_approval_emails.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    // One-way compatibility import only. Existing rows (including revocations) win.
    const legacy = [
      ...new Set(
        (process.env.MOCKMEAI_INVITED_EMAILS ?? "")
          .split(/[,\n]/u)
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    for (const email of legacy) {
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email))
        throw new Error("Invalid legacy invitation email");
      await tx`insert into interview_admin.beta_invites (email,approved) values (${email},true)
        on conflict (email) do nothing`;
    }
    console.log(
      "Private reporting and visitor-count schema are ready. Existing interviews were preserved.",
    );
  });
} catch (cause) {
  console.error(
    JSON.stringify({
      event: "admin_migration_failed",
      code:
        typeof cause?.code === "string" && /^[A-Z0-9_]{2,40}$/.test(cause.code)
          ? cause.code
          : "CONFIGURATION_OR_CONNECTION",
    }),
  );
  process.exitCode = 1;
} finally {
  if (sql) await sql.end({ timeout: 2 });
}
