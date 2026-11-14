"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AdminTime } from "@/components/admin-format";
import { approvalEmailFailureMessage } from "@/lib/approval-email-state";
import type { adminNotifications } from "@/lib/admin-notifications";
const labels = {
  welcome: "Welcome",
  new_user: "New user alert",
  spend_warning: "Spending warning",
  spend_cap: "Budget limit",
};
export function AdminNotificationsPanel({
  rows,
}: {
  rows: Awaited<ReturnType<typeof adminNotifications>>;
}) {
  const router = useRouter(),
    lock = useRef(false);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function retry(notificationId: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
        signal: AbortSignal.timeout(15_000),
      });
      setNotice(
        res.ok
          ? "Delivery checked. See its status below."
          : "Email could not be retried. Refresh to check its status.",
      );
      router.refresh();
    } catch {
      setNotice("Delivery could not be confirmed. Refresh before retrying.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3" aria-label="Account and spending emails">
      <h2 className="text-xl font-semibold">Account and spending emails</h2>
      <p>
        Latest 20 in this environment. New users get one welcome; the owner gets
        one signup alert. Spending alerts are once per threshold per UTC day.
      </p>
      <p className="text-sm">
        Sent means accepted by Resend. Failed deliveries retry on later
        signed-in visits, or here, for up to 23 hours. Unconfirmed deliveries
        need a check in Resend before any manual resend.
      </p>
      {notice && <p role="status">{notice}</p>}
      {!rows.length ? (
        <p>No email events recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {[
                  "Created (UTC)",
                  "Email",
                  "Recipient",
                  "Status",
                  "Action",
                ].map((label) => (
                  <th className="border-b p-3" scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="border-b p-3">
                    <AdminTime value={row.createdAt} />
                  </td>
                  <td className="border-b p-3">{labels[row.kind]}</td>
                  <td className="border-b p-3">{row.recipient}</td>
                  <td className="border-b p-3">
                    {row.status === "sent"
                      ? "Sent to email provider"
                      : row.status === "unknown"
                        ? "Delivery unconfirmed"
                        : row.status}
                    {row.failureCategory && (
                      <p>{approvalEmailFailureMessage(row.failureCategory)}</p>
                    )}
                    {row.referenceId && row.status !== "sent" && (
                      <p className="text-xs">Reference: {row.referenceId}</p>
                    )}
                  </td>
                  <td className="border-b p-3">
                    {row.canRetry && (
                      <button
                        className="practice-secondary"
                        disabled={busy}
                        onClick={() => void retry(row.id)}
                      >
                        Retry email
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
