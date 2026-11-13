import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { adminPageAccess } from "@/lib/admin-page-access";
import { adminQuery } from "@/lib/admin-query";
import { adminUserDetail } from "@/lib/admin-user-detail";
import { AdminInterviewDetail } from "@/components/admin-interview-detail";
import { AdminTime } from "@/components/admin-format";
import { adminMockAccess } from "@/lib/admin-mock-access";
import { AdminMockAccess } from "@/components/admin-mock-access";
export default async function AdminUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; includeExcluded?: string }>;
}) {
  await adminPageAccess();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  let query;
  try {
    const search = await searchParams;
    query = adminQuery(
      new URLSearchParams({
        page: search.page ?? "1",
        includeExcluded: search.includeExcluded ?? "0",
      }),
    );
  } catch {
    notFound();
  }
  let data;
  try {
    data = await adminUserDetail(id, query.page, query.includeExcluded);
  } catch {
    return (
      <p role="alert">
        Interview history unavailable. Check the reporting database and server
        logs.
      </p>
    );
  }
  if (!data) notFound();
  const mock = await adminMockAccess(id);
  const pageUrl = (page: number) =>
    `/admin/users/${id}?page=${page}&includeExcluded=${query.includeExcluded ? "1" : "0"}`;
  return (
    <div className="space-y-5">
      <Link
        className="underline"
        href={`/admin?includeExcluded=${query.includeExcluded ? "1" : "0"}`}
      >
        Back to users
      </Link>
      <h2 className="text-xl font-semibold">
        {data.user.email ?? "Email unavailable"}
      </h2>
      <AdminMockAccess userId={id} initial={mock.access} />
      {mock.changes.length > 0 && (
        <details>
          <summary>Mock access changes</summary>
          <ul>
            {mock.changes.map((change, index) => (
              <li key={index}>
                {change.action.replaceAll("_", " ")} ·{" "}
                {change.actor_id ?? "Server"} ·{" "}
                <AdminTime value={change.created_at.toISOString()} />
              </li>
            ))}
          </ul>
        </details>
      )}
      <p>
        Signed up: <AdminTime value={data.user.signupAt} /> · {data.total}{" "}
        recorded interviews in this reporting environment
      </p>
      <p className="text-sm">
        Older browser-only interviews are unavailable here. Unfinished does not
        mean failed. Durations are elapsed interview time, not active engagement
        time.
      </p>
      {!data.interviews.length && (
        <p>
          No interviews recorded for this user and filter. Historical activity
          before tracking is unavailable.
        </p>
      )}
      {data.interviews.map((item) => (
        <AdminInterviewDetail key={item.id} item={item} />
      ))}
      <nav className="flex gap-4" aria-label="Interview pages">
        {query.page > 1 && (
          <Link className="underline" href={pageUrl(query.page - 1)}>
            Previous
          </Link>
        )}
        <span>Page {query.page}</span>
        {query.page * data.pageSize < data.total && (
          <Link className="underline" href={pageUrl(query.page + 1)}>
            Next
          </Link>
        )}
      </nav>
    </div>
  );
}
