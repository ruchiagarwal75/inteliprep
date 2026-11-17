import "server-only";
import { requireAdminIdentity } from "@/lib/admin-auth";
import { reportingDb } from "@/lib/reporting-db";
import { recordScope } from "@/lib/admin-scope";
import { logServerEvent } from "@/lib/server-events";

export type VisitorCountryMetrics =
  | {
      status: "ready";
      trackingSince: string | null;
      countries: {
        countryCode: string | null;
        guests: number;
        accounts: number;
      }[];
    }
  | { status: "unavailable" };

export async function adminVisitorCountries(
  includeExcluded: boolean,
): Promise<VisitorCountryMetrics> {
  await requireAdminIdentity();
  const sql = reportingDb();
  try {
    const rows = await sql<
      {
        countryCode: string | null;
        guests: number;
        accounts: number;
        trackingSince: string;
      }[]
    >`
      select country_code as "countryCode",
        count(*) filter(where account_kind='guest')::int as guests,
        count(*) filter(where account_kind='account')::int as accounts,
        min(min(first_seen_at)) over()::text as "trackingSince"
      from interview_admin.app_account_countries where ${recordScope(includeExcluded)}
      group by country_code order by count(*) desc,country_code nulls last`;
    return {
      status: "ready",
      trackingSince: rows[0]?.trackingSince ?? null,
      countries: rows.map(({ countryCode, guests, accounts }) => ({
        countryCode,
        guests,
        accounts,
      })),
    };
  } catch (cause) {
    logServerEvent(
      {
        event: "framework_failure",
        route: "/api/admin/visitors",
        kind: "visitor_countries_unavailable",
      },
      cause,
    );
    return { status: "unavailable" };
  }
}
