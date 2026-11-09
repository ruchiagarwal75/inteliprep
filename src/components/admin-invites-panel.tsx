"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { adminInvites } from "@/lib/admin-invites";
import { AdminTime } from "@/components/admin-format";
import { AdminPendingAccounts } from "@/components/admin-pending-accounts";

export function AdminInvitesPanel({
  data,
  search,
}: {
  data: Awaited<ReturnType<typeof adminInvites>>;
  search: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function change(address: string, approved: boolean) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address, approved }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        setError(
          response.status === 401 || response.status === 403
            ? "Admin access could not be verified. Refresh and sign in again."
            : response.status === 400
              ? "Enter a valid Google account email."
              : "Access could not be updated. Please try again.",
        );
        return;
      }
      setNotice(
        `${approved ? "Approved" : "Revoked"} access for ${address.trim().toLowerCase()}.`,
      );
      if (approved) setEmail("");
      router.refresh();
    } catch {
      setError(
        "The update could not be confirmed. Refresh to check its status, or try again.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function approve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void change(email, true);
  }
  const pageUrl = (page: number) =>
    `/admin/access?${new URLSearchParams({ search, page: String(page), pendingPage: String(data.pendingPage) })}`;
  return (
    <section className="space-y-5" aria-label="Beta access">
      <h2 className="text-xl font-semibold">Beta access</h2>
      <p>
        Approve a Google account email before or after the person signs in.
        Changes apply to their next protected request without a redeploy. Your
        configured admin account always has access.
      </p>
      <form action="/admin/access" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          Search accounts and invitations
          <input
            name="search"
            defaultValue={search}
            maxLength={120}
            className="rounded border p-2"
          />
        </label>
        <button className="practice-secondary">Search</button>
      </form>
      {error && (
        <p role="alert" className="rounded border p-3">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <AdminPendingAccounts
        accounts={data.pending}
        total={data.pendingTotal}
        page={data.pendingPage}
        pageSize={data.pageSize}
        search={search}
        invitePage={data.page}
        busy={busy}
        onApprove={(address) => void change(address, true)}
        onRefresh={() => router.refresh()}
      />
      <h3 className="text-lg font-semibold">Invite by email</h3>
      <form onSubmit={approve} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          Google account email
          <input
            type="email"
            required
            maxLength={254}
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
            className="rounded border p-2"
          />
        </label>
        <button type="submit" disabled={busy} className="practice-primary">
          {busy ? "Saving…" : "Approve access"}
        </button>
      </form>
      <p className="text-sm">
        This grants app access. It does not send an email or change Google OAuth
        test-user or Vercel protection settings.
      </p>
      <h3 className="text-lg font-semibold">Invitations</h3>
      <p>
        {data.total} {data.total === 1 ? "invitation" : "invitations"} matching
        these filters
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Google email invitations and current beta access
          </caption>
          <thead>
            <tr>
              {["Email", "Access", "Updated (UTC)", "Action"].map((label) => (
                <th scope="col" className="border-b p-3" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.invites.map((invite) => (
              <tr key={invite.email}>
                <td className="border-b p-3">{invite.email}</td>
                <td className="border-b p-3">
                  {invite.approved ? "Approved" : "Revoked"}
                </td>
                <td className="border-b p-3">
                  <AdminTime value={invite.updatedAt} />
                </td>
                <td className="border-b p-3">
                  <button
                    type="button"
                    disabled={busy}
                    className="practice-secondary"
                    aria-label={`${invite.approved ? "Revoke" : "Approve"} access for ${invite.email}`}
                    onClick={() => void change(invite.email, !invite.approved)}
                  >
                    {invite.approved ? "Revoke" : "Approve"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.invites.length && <p>No invitations match these filters.</p>}
      <nav aria-label="Invitation pages" className="flex items-center gap-4">
        {data.page > 1 && (
          <Link className="underline" href={pageUrl(data.page - 1)}>
            Previous
          </Link>
        )}
        <span>Page {data.page}</span>
        {data.page * data.pageSize < data.total && (
          <Link className="underline" href={pageUrl(data.page + 1)}>
            Next
          </Link>
        )}
      </nav>
    </section>
  );
}
