import Link from "next/link";
import { adminPageAccess } from "@/lib/admin-page-access";
import { adminInvites } from "@/lib/admin-invites";
import { adminQuery } from "@/lib/admin-query";
import { AdminInvitesPanel } from "@/components/admin-invites-panel";

export default async function AdminAccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await adminPageAccess();
  const params = await searchParams;
  const search = new URLSearchParams();
  for (const key of ["search", "page"])
    if (typeof params[key] === "string") search.set(key, params[key]);
  let query;
  try {
    query = adminQuery(search);
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
        Invitations are unavailable. Check the database connection and
        invitation migration, then refresh.
      </p>
    );
  }
  return <AdminInvitesPanel data={data} search={query.search} />;
}
