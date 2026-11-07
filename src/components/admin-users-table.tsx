import Link from "next/link";
import type { adminUsers } from "@/lib/admin-users";
import { AdminTime } from "@/components/admin-format";
export function AdminUsersTable({
  data,
  search,
  includeExcluded,
}: {
  data: Awaited<ReturnType<typeof adminUsers>>;
  search: string;
  includeExcluded: boolean;
}) {
  const pageUrl = (page: number) =>
    `/admin?${new URLSearchParams({ search, page: String(page), includeExcluded: includeExcluded ? "1" : "0" })}`;
  return (
    <section className="space-y-3" aria-label="Registered users">
      <h2 className="text-xl font-semibold">Users ({data.total})</h2>
      <form className="flex flex-wrap items-end gap-2" action="/admin">
        <label className="flex flex-col gap-1">
          Search email
          <input
            name="search"
            defaultValue={search}
            maxLength={120}
            className="rounded border p-2"
          />
        </label>
        <input
          type="hidden"
          name="includeExcluded"
          value={includeExcluded ? "1" : "0"}
        />
        <button className="rounded border px-4 py-2">Search</button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Registered users and recorded interview activity
          </caption>
          <thead>
            <tr>
              {[
                "Email",
                "Signed up (UTC)",
                "Last interview activity (UTC)",
                "Recorded interviews",
              ].map((label) => (
                <th scope="col" className="border-b p-3" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.users.map((user) => (
              <tr key={user.id}>
                <td className="border-b p-3">
                  <Link
                    className="underline"
                    href={`/admin/users/${user.id}?includeExcluded=${includeExcluded ? "1" : "0"}`}
                  >
                    {user.email ?? "Email unavailable"}
                  </Link>
                </td>
                <td className="border-b p-3">
                  <AdminTime value={user.signupAt} />
                </td>
                <td className="border-b p-3">
                  {user.lastActivityAt ? (
                    <AdminTime value={user.lastActivityAt} />
                  ) : user.historyComplete ? (
                    "No interview activity recorded"
                  ) : (
                    "Unavailable before tracking; none recorded since"
                  )}
                </td>
                <td className="border-b p-3">{user.interviewCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.users.length && <p>No users match these filters.</p>}
      <nav aria-label="User pages" className="flex gap-4">
        {data.page > 1 && (
          <Link className="underline" href={pageUrl(data.page - 1)}>
            Previous
          </Link>
        )}
        <span>
          Page {data.page} · {data.pageSize} per page
        </span>
        {data.page * data.pageSize < data.total && (
          <Link className="underline" href={pageUrl(data.page + 1)}>
            Next
          </Link>
        )}
      </nav>
    </section>
  );
}
