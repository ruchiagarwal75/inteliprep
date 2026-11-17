import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type postgres from "postgres";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from "vitest";
import {
  startPlayPostgres,
  PLAY_TEST_USER,
  PLAY_OTHER_USER,
} from "./fixtures/play-postgres";
import { requestVisitorConnection } from "@/lib/visitor-ip";
import { trackAppViewer } from "@/lib/viewer-tracking";
import {
  recordIpVisitor,
  purgeExpiredVisitorIps,
  ipVisitorMetrics,
} from "@/lib/ip-visitor-tracking";
import { adminVisitorCountries } from "@/lib/admin-visitor-countries";
import { adminVisitors } from "@/lib/admin-visitors";

const harness = vi.hoisted(() => ({
  database: vi.fn<() => ReturnType<typeof postgres>>(),
}));
vi.mock("@/lib/reporting-db", () => ({ reportingDb: harness.database }));
// Redis is a separate boundary; this suite exercises real Postgres and RLS.
vi.mock("@/lib/viewer-row-budget", () => ({
  reserveViewerRow: async () => true,
}));
vi.mock("@/lib/admin-auth", () => ({
  requireAdminIdentity: async () => PLAY_OTHER_USER,
}));
let db: Awaited<ReturnType<typeof startPlayPostgres>>;
const migration =
  "supabase/migrations/20261117202406_visitor_connection_countries.sql";
const guest = { id: PLAY_TEST_USER, kind: "guest" } satisfies {
  id: string;
  kind: "guest";
};
function connection(ip: string, country?: string) {
  const request = new Request("https://example.invalid/api/monitoring/viewer", {
    headers: {
      "x-vercel-forwarded-for": ip,
      ...(country ? { "x-vercel-ip-country": country } : {}),
    },
  });
  const parsed = requestVisitorConnection(request);
  if (!parsed) throw Error("Invalid synthetic connection");
  return parsed;
}
beforeAll(async () => {
  db = await startPlayPostgres({ baseOnly: true });
  await db.operator.unsafe(`alter role mockmeai_reporting noinherit;
    alter table auth.users add column email text,add column created_at timestamptz default now(),
      add column is_anonymous boolean default false,add column deleted_at timestamptz;`);
  for (const name of [
    "20261106214658_interview_admin_reporting.sql",
    "20261107221500_app_viewer_reporting.sql",
    "20261108003142_reporting_least_privilege.sql",
    "20261109180853_identified_app_visitors.sql",
    "20261109184934_ip_visitor_comparison.sql",
    "20261117202406_visitor_connection_countries.sql",
  ])
    await db.operator.unsafe(
      await readFile(`supabase/migrations/${name}`, "utf8"),
    );
  // A second install must preserve schema/data and never require generated IDs.
  await db.operator.unsafe(await readFile(migration, "utf8"));
  harness.database.mockReturnValue(db.runtime);
}, 30000);
beforeEach(async () => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("CRON_SECRET", "isolated-retention-secret-".repeat(2));
  vi.stubEnv("VISITOR_IP_HASH_SECRET", "isolated-visitor-test-key-".repeat(2));
  vi.stubEnv("ADMIN_USER_ID", PLAY_OTHER_USER);
  vi.stubEnv("ADMIN_TEST_USER_IDS", "");
  await db.operator.unsafe(
    "truncate interview_admin.app_account_countries,interview_admin.app_ip_visitors,interview_admin.app_viewers,interview_admin.app_visitor_accounts",
  );
});
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  await db?.close();
});

it("persists canonical addresses privately, counts a guest once, and preserves signup counts through upgrade", async () => {
  const visitorId = randomUUID(),
    us = connection("::ffff:192.0.2.7", "US");
  for (let i = 0; i < 3; i++)
    await trackAppViewer({
      visitorId,
      session: guest,
      local: false,
      connection: us,
    });
  const before = await adminVisitors(false);
  expect(before.identifiedAccounts).toBe(0);
  expect(before.countries).toMatchObject({
    status: "ready",
    countries: [{ countryCode: "US", guests: 1, accounts: 0 }],
  });
  expect(before.ipComparison).toMatchObject({ status: "ready", total: 1 });
  expect(JSON.stringify(before)).not.toContain(us.rawIp);
  expect(JSON.stringify(before)).not.toContain(us.hash);
  const [stored] =
    await db.operator`select host(raw_ip) as ip,country_code from interview_admin.app_ip_visitors`;
  expect(stored).toEqual({ ip: "192.0.2.7", country_code: "US" });
  await trackAppViewer({
    visitorId,
    session: { id: guest.id, kind: "account" },
    local: false,
    connection: connection("2001:db8::1", "IN"),
  });
  // A stale guest token must not regress the account classification or its origin.
  await trackAppViewer({
    visitorId,
    session: guest,
    local: false,
    connection: connection("192.0.2.9", "CA"),
  });
  const after = await adminVisitors(false);
  expect(after.identifiedAccounts).toBe(1);
  expect(after.countries).toMatchObject({
    status: "ready",
    countries: [{ countryCode: "US", guests: 0, accounts: 1 }],
  });
});

it("keeps unknown origins explicit, fills them on return, and excludes owner/preview data", async () => {
  const visitorId = randomUUID();
  await trackAppViewer({ visitorId, session: guest, local: false });
  expect(await adminVisitorCountries(false)).toMatchObject({
    status: "ready",
    countries: [{ countryCode: null, guests: 1, accounts: 0 }],
  });
  await trackAppViewer({
    visitorId,
    session: guest,
    local: false,
    connection: connection("192.0.2.1", "IN"),
  });
  const ownerConnection = connection("192.0.2.1", "US");
  const ownerBrowser = randomUUID();
  await trackAppViewer({
    visitorId: ownerBrowser,
    session: { id: PLAY_OTHER_USER, kind: "account" },
    local: false,
    connection: ownerConnection,
  });
  await trackAppViewer({
    visitorId: ownerBrowser,
    local: false,
    connection: ownerConnection,
  });
  expect(await ipVisitorMetrics(false)).toMatchObject({
    status: "ready",
    total: 1,
  });
  expect(await adminVisitorCountries(false)).toMatchObject({
    status: "ready",
    countries: [{ countryCode: "IN", guests: 1, accounts: 0 }],
  });
  const all = await adminVisitorCountries(true);
  expect(all.status).toBe("ready");
  if (all.status === "ready")
    expect(all.countries).toEqual(
      expect.arrayContaining([{ countryCode: "US", guests: 0, accounts: 1 }]),
    );
  vi.stubEnv("VERCEL_ENV", "preview");
  expect(await adminVisitorCountries(false)).toEqual({
    status: "ready",
    trackingSince: null,
    countries: [],
  });
});

it("expires only old raw addresses while preserving country reports, unique counts and first visits", async () => {
  const old = connection("192.0.2.1", "US"),
    fresh = connection("2001:db8::2", "IN");
  await recordIpVisitor(old, false);
  await recordIpVisitor(fresh, false);
  await db.operator`update interview_admin.app_ip_visitors set first_seen_at=now()-interval '40 days',last_seen_at=now()-interval '31 days' where ip_hash=${old.hash}`;
  expect(await purgeExpiredVisitorIps()).toBe(1);
  expect(await purgeExpiredVisitorIps()).toBe(0);
  expect(await ipVisitorMetrics(false)).toMatchObject({
    status: "ready",
    total: 2,
  });
  const rows =
    await db.operator`select ip_hash,host(raw_ip) as ip,country_code from interview_admin.app_ip_visitors order by country_code`;
  expect(rows).toEqual([
    { ip_hash: fresh.hash, ip: "2001:db8::2", country_code: "IN" },
    { ip_hash: old.hash, ip: null, country_code: "US" },
  ]);
  await recordIpVisitor(old, false);
  const [restored] =
    await db.operator`select host(raw_ip) as ip,first_seen_at<now()-interval '39 days' as preserved from interview_admin.app_ip_visitors where ip_hash=${old.hash}`;
  expect(restored).toEqual({ ip: old.rawIp, preserved: true });
});

it("denies both browser roles access to addresses and account-country associations", async () => {
  const [rls] =
    await db.operator`select relrowsecurity from pg_class where oid='interview_admin.app_account_countries'::regclass`;
  expect(rls.relrowsecurity).toBe(true);
  for (const role of ["anon", "authenticated"]) {
    await expect(
      db.operator.begin(async (tx) => {
        await tx.unsafe(`set local role ${role}`);
        await tx.unsafe("select raw_ip from interview_admin.app_ip_visitors");
      }),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.operator.begin(async (tx) => {
        await tx.unsafe(`set local role ${role}`);
        await tx.unsafe("select * from interview_admin.app_account_countries");
      }),
    ).rejects.toMatchObject({ code: "42501" });
  }
  await expect(
    db.runtime.unsafe(
      "alter table interview_admin.app_ip_visitors add column forbidden text",
    ),
  ).rejects.toMatchObject({ code: "42501" });
});

it("keeps country and connection counts working without collecting raw IPs when cleanup is unconfigured", async () => {
  vi.stubEnv("CRON_SECRET", "");
  const input = connection("192.0.2.10", "US");
  await recordIpVisitor(input, false);
  const [stored] =
    await db.operator`select raw_ip,country_code from interview_admin.app_ip_visitors`;
  expect(stored).toEqual({ raw_ip: null, country_code: "US" });
  expect(await ipVisitorMetrics(false)).toMatchObject({
    status: "ready",
    total: 1,
  });
});
