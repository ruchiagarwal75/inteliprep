"use client";
import { BRAND } from "@/lib/brand";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { adminInvites } from "@/lib/admin-invites";
import { AdminPendingAccounts } from "@/components/admin-pending-accounts";
import { AdminInvitationsTable } from "@/components/admin-invitations-table";
import type { ApprovalEmailState } from "@/lib/approval-email-state";

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
  async function submit(
    input: { email: string; approved: boolean } | { notificationId: string },
  ) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const retry = "notificationId" in input;
      const response = await fetch(
        `/api/admin/invites${retry ? "/email" : ""}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: AbortSignal.timeout(30000),
        },
      );
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
      const result = (await response.json()) as {
        notification?: ApprovalEmailState | null;
      };
      const prefix =
        "email" in input
          ? `${input.approved ? "Approved" : "Revoked"} access for ${input.email.trim().toLowerCase()}. `
          : "";
      setNotice(
        prefix +
          (result.notification?.status === "sent"
            ? "Approval email sent to the email provider."
            : result.notification
              ? "Email delivery is not confirmed. Check its status below; access remains approved."
              : retry
                ? "No current approval email is available to send."
                : ""),
      );
      if ("approved" in input && input.approved) setEmail("");
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
  function change(address: string, approved: boolean) {
    return submit({ email: address, approved });
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
        New approvals send an email from hello@{BRAND.domain}. If delivery
        fails, access stays approved and you can retry the email below. Existing
        approvals are not emailed automatically.
      </p>
      <h3 className="text-lg font-semibold">Invitations</h3>
      <p>
        {data.total} {data.total === 1 ? "invitation" : "invitations"} matching
        these filters
      </p>
      <AdminInvitationsTable
        invites={data.invites}
        busy={busy}
        onChange={(address, approved) => void change(address, approved)}
        onRetry={(notificationId) => void submit({ notificationId })}
      />
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
