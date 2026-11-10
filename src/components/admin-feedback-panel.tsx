import Link from "next/link";
import { AdminTime } from "@/components/admin-format";
import { AdminPracticeFeedbackDetail } from "@/components/admin-practice-feedback-detail";
import type { adminPracticeFeedback } from "@/lib/admin-practice-feedback";
import { getProblem } from "@/lib/problems";
import { LIKED_CHOICES, RETURN_CHOICES } from "@/lib/practice-feedback";

export function AdminFeedbackPanel({
  data,
  search,
  includeExcluded,
}: {
  data: Awaited<ReturnType<typeof adminPracticeFeedback>>;
  search: string;
  includeExcluded: boolean;
}) {
  const pageUrl = (page: number) =>
    `/admin/feedback?${new URLSearchParams({ search, page: String(page), includeExcluded: includeExcluded ? "1" : "0" })}`;
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">Feedback</h2>
        <p className="mt-2 text-sm">
          All recorded feedback · {data.environment} · current search and
          exclusion filters. Counts are interviews with a submitted response or
          skip, not all completed interviews.
        </p>
      </header>
      <form action="/admin/feedback" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          Search email or comment
          <input
            className="rounded border p-2"
            type="search"
            name="search"
            defaultValue={search}
            maxLength={120}
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="includeExcluded"
            value="1"
            defaultChecked={includeExcluded}
          />
          Include admin and test activity
        </label>
        <button className="rounded border px-4 py-2">Apply filters</button>
      </form>
      <section
        aria-label="Feedback totals"
        className="space-y-3 rounded-lg border p-4"
      >
        <p>
          <strong>{data.counts.answered}</strong>{" "}
          {data.counts.answered === 1 ? "interview" : "interviews"} answered ·{" "}
          <strong>{data.counts.skipped}</strong>{" "}
          {data.counts.skipped === 1 ? "interview" : "interviews"} skipped ·{" "}
          <strong>{data.counts.menu}</strong> menu submissions
        </p>
        <p>Choice counts across all non-skipped feedback:</p>
        <dl className="flex flex-wrap gap-6">
          {[...LIKED_CHOICES, ...RETURN_CHOICES].map(([key, label]) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd className="text-2xl font-semibold">{data.counts[key]}</dd>
            </div>
          ))}
        </dl>
      </section>
      {!data.entries.length && <p>No feedback matches these filters.</p>}
      {data.entries.map((entry) => (
        <article className="space-y-3 rounded-lg border p-4" key={entry.id}>
          <header className="space-y-1">
            <p>
              <AdminTime value={entry.createdAt} />
            </p>
            <Link
              className="[overflow-wrap:anywhere] underline"
              href={`/admin/users/${entry.userId}?includeExcluded=${includeExcluded ? "1" : "0"}`}
            >
              {entry.email ?? "Email unavailable"}
            </Link>
            <p>
              {entry.problemId
                ? `${getProblem(entry.problemId)?.title ?? entry.problemId} · ${entry.level}`
                : "Sent from account menu"}
            </p>
          </header>
          <AdminPracticeFeedbackDetail feedback={entry} />
        </article>
      ))}
      <nav className="flex gap-4" aria-label="Feedback pages">
        {data.page > 1 && (
          <Link className="underline" href={pageUrl(data.page - 1)}>
            Previous
          </Link>
        )}
        <span>
          Page {data.page} · {data.pageSize} per page · {data.total} records
        </span>
        {data.page * data.pageSize < data.total && (
          <Link className="underline" href={pageUrl(data.page + 1)}>
            Next
          </Link>
        )}
      </nav>
    </div>
  );
}
