import { adminNotifications } from "@/lib/admin-notifications";
import { AdminNotificationsPanel } from "@/components/admin-notifications-panel";
import Link from "next/link";
import { adminPageAccess } from "@/lib/admin-page-access";
import { adminInvites, adminInviteQuery } from "@/lib/admin-invites";
import { AdminInvitesPanel } from "@/components/admin-invites-panel";

export default async function AdminAccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await adminPageAccess();
  const params = await searchParams;
  const search = new URLSearchParams();
  for (const key of ["search", "page", "pendingPage"])
    if (typeof params[key] === "string") search.set(key, params[key]);
  let query;
  try {
    query = adminInviteQuery(search);
  } catch {
    return (
      <p role="alert">
        Invalid search or page.{" "}
        <Link className="underline" href="/admin/access">
          Reset filters
        </Link>
      </p>
    );
  }
  let data;
  try {
    data = await adminInvites(query);
  } catch {
    return (
      <p role="alert">
        Access records are unavailable. Check the database connection and
        invitation migration, then refresh.
      </p>
    );
  }
  const notifications = await adminNotifications()
    .then((rows) => ({ rows }))
    .catch(() => null);
  return (
    <div className="space-y-8">
      <AdminInvitesPanel data={data} search={query.search} />
      {notifications ? (
        <AdminNotificationsPanel rows={notifications.rows} />
      ) : (
        <p role="alert">
          Email status is unavailable. Check the notification migration and
          connection.
        </p>
      )}
    </div>
  );
}
