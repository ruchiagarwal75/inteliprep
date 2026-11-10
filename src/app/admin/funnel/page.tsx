import { adminPageAccess } from "@/lib/admin-page-access";
import { adminBetaFunnel } from "@/lib/admin-beta-funnel";
import { betaFunnelQuery } from "@/lib/beta-funnel-query";
import { AdminBetaFunnelPanel } from "@/components/admin-beta-funnel-panel";
export default async function FunnelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await adminPageAccess();
  const params = await searchParams,
    search = new URLSearchParams();
  for (const key of ["from", "to", "page", "includeExcluded", "search"])
    if (typeof params[key] === "string") search.set(key, params[key]);
  let query;
  try {
    query = betaFunnelQuery(search);
  } catch {
    return (
      <p role="alert">
        Invalid date range or page. Choose valid UTC dates with the start before
        the end.
      </p>
    );
  }
  let data;
  try {
    data = await adminBetaFunnel(query);
  } catch {
    return (
      <p role="alert">
        Beta funnel unavailable. Check the reporting database and funnel
        migration, then refresh. Unavailable does not mean zero activity.
      </p>
    );
  }
  return <AdminBetaFunnelPanel data={data} query={query} />;
}
