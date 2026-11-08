import postgres from "postgres";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, chmodSync } from "node:fs";

// Operator-only credential provisioning, separate from the application runtime.
process.loadEnvFile(".env.local");
let sql;
try {
  if (process.env.SUPABASE_REPORTING_CONNECTION_STRING)
    throw Object.assign(
      new Error("Already configured; refusing to rotate implicitly"),
      { code: "ALREADY_CONFIGURED" },
    );
  const url = new URL(process.env.SUPABASE_CONNECTION_STRING ?? "");
  const password = randomBytes(32).toString("hex");
  sql = postgres(url.href, {
    prepare: false,
    max: 1,
    ssl: {
      rejectUnauthorized: true,
      ca: readFileSync("certificates/supabase-root-2021.crt", "utf8"),
    },
    onnotice: () => {},
  });
  await sql.begin(async (tx) => {
    await tx`select set_config('mockmeai.reporting_password',${password},true)`;
    await tx`do $$ begin execute format('alter role mockmeai_reporting login password %L',current_setting('mockmeai.reporting_password')); end $$`;
  });
  const username = decodeURIComponent(url.username);
  const suffix = username.includes(".")
    ? username.slice(username.indexOf("."))
    : "";
  url.username = "mockmeai_reporting" + suffix;
  url.password = password;
  const path = ".env.local";
  writeFileSync(
    path,
    readFileSync(path, "utf8").trimEnd() +
      "\nSUPABASE_REPORTING_CONNECTION_STRING=" +
      JSON.stringify(url.href) +
      "\n",
    { mode: 0o600 },
  );
  chmodSync(path, 0o600);
  console.log(
    "Configured the restricted reporting connection in .env.local. No credential was printed.",
  );
} catch (cause) {
  console.error(
    JSON.stringify({
      event: "reporting_provision_failed",
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
