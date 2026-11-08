import "server-only";
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let connectionString: string | undefined;
let client: ReturnType<typeof postgres> | undefined;
export class ReportingUnavailableError extends Error {
  constructor() {
    super(
      "Reporting is unavailable. Check the database connection and reporting migration.",
    );
  }
}
export function reportingConfigured() {
  return (
    Boolean(process.env.SUPABASE_REPORTING_CONNECTION_STRING) &&
    process.env.NODE_ENV !== "test"
  );
}
export function reportingDb() {
  if (!process.env.SUPABASE_REPORTING_CONNECTION_STRING)
    throw new ReportingUnavailableError();
  if (
    client &&
    connectionString !== process.env.SUPABASE_REPORTING_CONNECTION_STRING
  ) {
    void client.end({ timeout: 1 }).catch(() => {});
    client = undefined;
  }
  connectionString = process.env.SUPABASE_REPORTING_CONNECTION_STRING;
  client ??= postgres(connectionString, {
    prepare: false,
    ssl: {
      rejectUnauthorized: true,
      ca: readFileSync(
        join(process.cwd(), "certificates/supabase-root-2021.crt"),
        "utf8",
      ),
    },
    max: 2,
    max_pipeline: 1,
    connect_timeout: 3,
    idle_timeout: 10,
    max_lifetime: 60,
    connection: {
      application_name: "inteliprep-reporting",
      statement_timeout: 3000,
    },
    onnotice: () => {},
  });
  return client;
}
