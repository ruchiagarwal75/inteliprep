import { afterEach, expect, it, vi } from "vitest";
import { reportingConfigured, reportingDb } from "@/lib/reporting-db";
afterEach(() => vi.unstubAllEnvs());
it("never falls back to the privileged migration connection", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv(
    "SUPABASE_CONNECTION_STRING",
    "postgres://privileged:secret@db.invalid/postgres",
  );
  vi.stubEnv("SUPABASE_REPORTING_CONNECTION_STRING", "");
  expect(reportingConfigured()).toBe(false);
  expect(() => reportingDb()).toThrow("unavailable");
  vi.stubEnv(
    "SUPABASE_REPORTING_CONNECTION_STRING",
    "postgres://mockmeai_reporting:fixture@db.invalid/postgres",
  );
  expect(reportingConfigured()).toBe(true);
});
