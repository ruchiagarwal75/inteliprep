import Link from "next/link";
import { adminPageAccess } from "@/lib/admin-page-access";
import { adminQuery } from "@/lib/admin-query";
import { adminPracticeFeedback } from "@/lib/admin-practice-feedback";
import { AdminFeedbackPanel } from "@/components/admin-feedback-panel";

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await adminPageAccess();
  const params = await searchParams,
    search = new URLSearchParams();
  for (const key of ["search", "page", "includeExcluded"])
    if (typeof params[key] === "string") search.set(key, params[key]);
  let query;
  try {
    query = adminQuery(search);
  } catch {
    return (
      <p role="alert">
        Invalid search or page.{" "}
        <Link href="/admin/feedback" className="underline">
          Reset filters
        </Link>
      </p>
    );
  }
  let data;
  try {
    data = await adminPracticeFeedback(query);
  } catch {
    return (
      <p role="alert">
        Feedback unavailable. Check the reporting database and feedback
        migration, then refresh. Unavailable does not mean no feedback.
      </p>
    );
  }
  return (
    <AdminFeedbackPanel
      data={data}
      search={query.search}
      includeExcluded={query.includeExcluded}
    />
  );
}
