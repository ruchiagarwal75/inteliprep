import { adminPageAccess } from "@/lib/admin-page-access";
import { adminQuery } from "@/lib/admin-query";
import { adminOverview } from "@/lib/admin-overview";
import { adminUsers } from "@/lib/admin-users";
import { AdminOverviewPanel } from "@/components/admin-overview-panel";
import { AdminUsersTable } from "@/components/admin-users-table";
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await adminPageAccess();
  const params = await searchParams;
  const search = new URLSearchParams();
  for (const key of ["search", "page", "includeExcluded"])
    if (typeof params[key] === "string") search.set(key, params[key]);
  let query;
  try {
    query = adminQuery(search);
  } catch {
    return (
      <p role="alert">
        Invalid search or page.{" "}
        <a className="underline" href="/admin">
          Reset filters
        </a>
      </p>
    );
  }
  const [overview, users] = await Promise.allSettled([
    adminOverview(query.includeExcluded),
    adminUsers(query),
  ]);
  return (
    <div className="space-y-8">
      <form action="/admin" className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="includeExcluded"
            value="1"
            defaultChecked={query.includeExcluded}
          />
          Include admin and test activity
        </label>
        <button className="rounded border px-3 py-1.5">Apply filter</button>
        <p className="text-sm">
          {query.includeExcluded
            ? "Admin/test data included."
            : "Admin account, configured test users and 1-minute tests excluded by default."}
        </p>
      </form>
      {overview.status === "fulfilled" ? (
        <AdminOverviewPanel
          data={overview.value}
          includeExcluded={query.includeExcluded}
        />
      ) : (
        <p role="alert" className="rounded border p-4">
          Overview unavailable. Check SUPABASE_CONNECTION_STRING, the reporting
          migration, and server logs. This does not mean zero activity.
        </p>
      )}
      {users.status === "fulfilled" ? (
        <AdminUsersTable
          data={users.value}
          search={query.search}
          includeExcluded={query.includeExcluded}
        />
      ) : (
        <p role="alert">User data unavailable; no counts can be inferred.</p>
      )}
      <p className="text-sm">
        Drawing pauses interviewer questions, not the interview timer. Durations
        measure elapsed interview time, not active engagement. Unfinished
        sessions stop accumulating time at their last recorded action. Tracking
        is best-effort; infrastructure failures are kept in server logs.
      </p>
    </div>
  );
}
