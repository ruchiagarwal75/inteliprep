import Link from "next/link";
import { AdminTime } from "@/components/admin-format";
import type { adminBetaFunnel } from "@/lib/admin-beta-funnel";
import { FUNNEL_STEPS, type betaFunnelQuery } from "@/lib/beta-funnel-query";
export function AdminBetaFunnelPanel({
  data,
  query,
}: {
  data: Awaited<ReturnType<typeof adminBetaFunnel>>;
  query: ReturnType<typeof betaFunnelQuery>;
}) {
  const unavailable = (key: string) =>
    ["signed_in", "score_threshold_passed", "scorecard_opened"].includes(key) &&
    Date.parse(query.until) <= Date.parse(data.trackingSince);
  const pageUrl = (page: number) =>
    `/admin/funnel?${new URLSearchParams({ from: query.from, to: query.to, search: query.search, includeExcluded: query.includeExcluded ? "1" : "0", page: String(page) })}`;
  return (
    <section className="space-y-5" aria-label="Beta funnel">
      <h2 className="text-2xl font-semibold">Beta funnel</h2>
      <p>
        {query.from} through {query.to}, inclusive UTC dates ·{" "}
        {data.environment}
      </p>
      <form action="/admin/funnel" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          From
          <input
            name="from"
            type="date"
            defaultValue={query.from}
            className="rounded border p-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Through
          <input
            name="to"
            type="date"
            defaultValue={query.to}
            className="rounded border p-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Search email
          <input
            name="search"
            maxLength={120}
            defaultValue={query.search}
            className="rounded border p-2"
          />
        </label>
        <label>
          <input
            type="checkbox"
            name="includeExcluded"
            value="1"
            defaultChecked={query.includeExcluded}
          />{" "}
          Include admin and test activity
        </label>
        <button className="rounded border px-4 py-2">Apply filters</button>
      </form>
      <p className="text-sm">
        Totals count distinct users reaching each step during the selected
        period. These are activity counts, not a signup cohort, so a later step
        can be higher than an earlier one.
      </p>
      <dl className="flex flex-wrap gap-6 rounded-lg border p-4">
        {FUNNEL_STEPS.map(([key, label]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd className="text-2xl font-semibold">
              {unavailable(key) ? "Unavailable" : data.counts[key]}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-sm">
        Sign-in sessions, verified scoring eligibility and scorecard opens are
        recorded from <AdminTime value={data.trackingSince} />. Older values for
        these steps are unavailable. Eligibility is recorded on the next
        server-verified interview action; no background activity is inferred.
        Refreshes and retries do not create extra milestones.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="text-left">
            Per-user activity counts in this period
          </caption>
          <thead>
            <tr>
              <th className="p-2">User</th>
              {FUNNEL_STEPS.map(([key, label]) => (
                <th className="p-2" key={key}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.users.map((user) => (
              <tr key={user.userId}>
                <td className="border-t p-2">
                  <Link
                    className="underline"
                    href={`/admin/users/${user.userId}?includeExcluded=${query.includeExcluded ? "1" : "0"}`}
                  >
                    {user.email ?? "Email unavailable"}
                  </Link>
                </td>
                {FUNNEL_STEPS.map(([key]) => (
                  <td className="border-t p-2" key={key}>
                    {unavailable(key) ? "Unavailable" : user[key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.users.length && (
        <p>No recorded activity matches this range and filter.</p>
      )}
      <nav className="flex gap-4" aria-label="Funnel pages">
        {query.page > 1 && (
          <Link className="underline" href={pageUrl(query.page - 1)}>
            Previous
          </Link>
        )}
        <span>
          Page {query.page} · {data.pageSize} users per page
        </span>
        {query.page * data.pageSize < data.total && (
          <Link className="underline" href={pageUrl(query.page + 1)}>
            Next
          </Link>
        )}
      </nav>
    </section>
  );
}
