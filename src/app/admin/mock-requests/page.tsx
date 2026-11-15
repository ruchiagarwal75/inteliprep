import Link from "next/link";
import { adminPageAccess } from "@/lib/admin-page-access";
import { adminQuery } from "@/lib/admin-query";
import { adminMockTrials } from "@/lib/admin-mock-trials";
import { listProblems } from "@/lib/problems";
import { AdminTime } from "@/components/admin-format";
import { AdminMockTrialActions } from "@/components/admin-mock-trial-actions";
export default async function MockRequestsPage({
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
        Invalid filters. <Link href="/admin/mock-requests">Reset filters</Link>
      </p>
    );
  }
  let data;
  try {
    data = await adminMockTrials(query);
  } catch {
    return (
      <p role="alert">
        Mock requests are unavailable. Check the reporting database and
        migration, then refresh.
      </p>
    );
  }
  const titles = new Map(listProblems().map((p) => [p.problemId, p.title]));
  function pageUrl(page: number) {
    const copy = new URLSearchParams(search);
    copy.set("page", String(page));
    return `/admin/mock-requests?${copy}`;
  }
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Mock beta requests</h2>
      <p>
        All recorded activity in {data.environment}. Counts are unique accounts
        per interview, starting with this release.
      </p>
      <p>
        Approval grants one trial. Revoking blocks new starts and keeps existing
        interviews and scorecards.
      </p>
      <form className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1">
          Search email or interview
          <input
            name="search"
            defaultValue={query.search}
            maxLength={120}
            className="max-w-full border p-2"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="includeExcluded"
            value="1"
            defaultChecked={query.includeExcluded}
          />
          Include test and excluded users
        </label>
        <button className="practice-secondary">Apply filters</button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="text-left">
            Demand by interview. Search filters the request list below.
          </caption>
          <thead>
            <tr>
              {[
                "Interview",
                "Seen",
                "Requested",
                "Approved",
                "Started",
                "Completed",
                "Repeat use",
              ].map((t) => (
                <th className="p-2" key={t}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.demand.map((d) => (
              <tr key={d.problemId}>
                <th className="p-2">
                  {titles.get(d.problemId) ?? d.problemId}
                </th>
                {[
                  d.seen,
                  d.requested,
                  d.approved,
                  d.started,
                  d.completed,
                  d.repeat,
                ].map((n, i) => (
                  <td className="p-2" key={i}>
                    {n}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm">
        Seen means a request card was visible in a foreground tab. Approved
        includes past approvals. Completed uses saved server outcomes. Repeat
        use means two recorded starts after the request. Older Pro interest is
        not attributed to a question.
      </p>
      <h3 className="text-lg font-semibold">Requests ({data.total})</h3>
      {!data.rows.length && <p>No requests match these filters.</p>}
      {data.rows.map((row) => (
        <section
          className="paper-card space-y-3 p-4"
          key={row.id}
          aria-label={`${row.email ?? row.userId}: ${titles.get(row.problemId) ?? row.problemId}`}
        >
          <h4>
            <Link
              className="underline"
              href={`/admin/users/${row.userId}?includeExcluded=${query.includeExcluded ? 1 : 0}`}
            >
              {row.email ?? row.userId}
            </Link>
          </h4>
          <p>
            {titles.get(row.problemId) ?? row.problemId} · {row.state}
          </p>
          <p>
            Requested <AdminTime value={row.requestedAt} />
          </p>
          <AdminMockTrialActions row={row} />
        </section>
      ))}
      <nav className="flex gap-4" aria-label="Mock request pages">
        {query.page > 1 && <Link href={pageUrl(query.page - 1)}>Previous</Link>}
        <span>Page {query.page}</span>
        {query.page * data.pageSize < data.total && (
          <Link href={pageUrl(query.page + 1)}>Next</Link>
        )}
      </nav>
    </div>
  );
}
