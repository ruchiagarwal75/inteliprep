import Link from "next/link";
import type { PendingBetaAccount } from "@/lib/admin-invites";
import { AdminTime } from "@/components/admin-format";

export function AdminPendingAccounts({
  accounts,
  total,
  page,
  pageSize,
  search,
  invitePage,
  busy,
  onRevoke,
  onRefresh,
}: {
  accounts: PendingBetaAccount[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  invitePage: number;
  busy: boolean;
  onRevoke: (email: string) => void;
  onRefresh: () => void;
}) {
  const pageUrl = (next: number) =>
    `/admin/access?${new URLSearchParams({ search, page: String(invitePage), pendingPage: String(next) })}`;
  return (
    <section className="space-y-3" aria-label="Accounts with automatic access">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Automatic access ({total})</h3>
        <button
          type="button"
          className="practice-secondary"
          disabled={busy}
          onClick={onRefresh}
        >
          Refresh accounts
        </button>
      </div>
      <p className="text-sm">
        Google accounts get access automatically. These accounts have no
        override, newest first.
      </p>
      {!accounts.length ? (
        <p>No accounts with automatic access match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Registered accounts with automatic access
            </caption>
            <thead>
              <tr>
                {["Email", "Signed up (UTC)", "Action"].map((label) => (
                  <th scope="col" className="border-b p-3" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="border-b p-3">
                    <Link
                      className="underline"
                      href={`/admin/users/${account.id}`}
                    >
                      {account.email}
                    </Link>
                  </td>
                  <td className="border-b p-3">
                    <AdminTime value={account.signupAt} />
                  </td>
                  <td className="border-b p-3">
                    <button
                      type="button"
                      className="practice-secondary"
                      disabled={busy}
                      aria-label={`Revoke access for ${account.email}`}
                      onClick={() => onRevoke(account.email)}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav className="flex gap-4" aria-label="Automatic access account pages">
        {page > 1 && (
          <Link className="underline" href={pageUrl(page - 1)}>
            Previous
          </Link>
        )}
        <span>Page {page}</span>
        {page * pageSize < total && (
          <Link className="underline" href={pageUrl(page + 1)}>
            Next
          </Link>
        )}
      </nav>
    </section>
  );
}
