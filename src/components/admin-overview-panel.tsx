import Link from "next/link";
import { getProblem } from "@/lib/problems";
import type { AdminOverview } from "@/lib/admin-records";
import { AdminCost, AdminTime } from "@/components/admin-format";
import { formatInterviewTime } from "@/lib/interview-timer";

export function AdminOverviewPanel({
  data,
  includeExcluded,
}: {
  data: AdminOverview;
  includeExcluded: boolean;
}) {
  const historyPeriod = <>Recorded interviews · {data.environment}</>;
  const cards = [
    {
      label: "Too short to score",
      value: data.interviews.tooShort ?? "Unavailable",
      period: "Since the beta scoring update; older outcomes unavailable",
    },
    {
      label: "Registered users",
      value: data.users.total,
      period: "All current accounts · all time",
    },
    {
      label: "New signups",
      value: data.users.newSignups,
      period: "Last 7 days",
    },
    {
      label: "Users with an interview action",
      value: data.users.active,
      period: "Last 7 days · recorded activity",
    },
    {
      label: "Interviews started",
      value: data.interviews.started,
      period: historyPeriod,
    },
    {
      label: "Completed",
      value: data.interviews.completed,
      period: historyPeriod,
    },
    {
      label: "Failed to start",
      value: data.interviews.failed,
      period: historyPeriod,
    },
    {
      label: "Unfinished",
      value: data.interviews.unfinished,
      period: historyPeriod,
    },
    {
      label: "Explicitly exited",
      value: data.interviews.exited,
      period: historyPeriod,
    },
    {
      label: "Average completed duration",
      value:
        data.interviews.averageSeconds === null
          ? "Unavailable: no valid completed timings"
          : formatInterviewTime(Math.floor(data.interviews.averageSeconds)),
      period: `${data.interviews.timedCompleted} completed interviews with valid timing · elapsed interview time`,
    },
  ];
  return (
    <>
      <p className="text-sm">
        Environment: <strong>{data.environment}</strong>. Reporting began{" "}
        <AdminTime value={data.trackingSince} />. Earlier interview totals,
        usage and activity are unavailable; verified sessions recovered later
        are marked partial. Account counts use the existing Supabase registry.
      </p>
      <p className="text-sm">
        Last 7 days: <AdminTime value={data.sevenDaysAgo} /> –{" "}
        <AdminTime value={data.generatedAt} />. All times UTC.
      </p>
      <section
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Overview metrics"
      >
        {cards.map((card) => (
          <article key={card.label} className="rounded-lg border p-4">
            <h2 className="text-sm font-medium">{card.label}</h2>
            <p className="my-2 text-2xl font-semibold">{card.value}</p>
            <p className="text-xs">{card.period}</p>
          </article>
        ))}
      </section>
      <section className="rounded-lg border p-4" aria-label="Estimated AI cost">
        <h2 className="font-semibold">
          Estimated AI cost · all recorded calls in {data.environment}
        </h2>
        <p className="my-2">
          <AdminCost cost={data.cost} />
        </p>
        <p className="text-sm">
          {data.cost.totalCalls} call attempts; {data.cost.pricedCalls} priced.
          Includes failed and retried calls when usage is reported. Missing
          usage or pricing is unavailable, never zero. Estimates are not an
          invoice.
        </p>
      </section>
      <section className="space-y-2" aria-label="Recent interview activity">
        <h2 className="text-xl font-semibold">
          Recent interview activity · latest 20 recorded milestones
        </h2>
        {!data.activity.length ? (
          <p>No interview milestones recorded for this filter.</p>
        ) : (
          <ul className="divide-y">
            {data.activity.map((item) => (
              <li className="py-2 text-sm" key={item.interviewId + item.event}>
                <AdminTime value={item.at} /> · {item.event} ·{" "}
                {getProblem(item.problemId)?.title ?? item.problemId} ·{" "}
                {item.userId ? (
                  <Link
                    className="underline"
                    href={`/admin/users/${item.userId}?includeExcluded=${includeExcluded ? "1" : "0"}`}
                  >
                    {item.email ?? "Email unavailable"}
                  </Link>
                ) : (
                  "Account unavailable"
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-2" aria-label="Recent failures">
        <h2 className="text-xl font-semibold">
          Recent failures · latest 20 recorded failures
        </h2>
        {!data.failures.length ? (
          <p>No failures recorded for this filter.</p>
        ) : (
          <ul className="divide-y">
            {data.failures.map((item) => (
              <li className="space-y-1 py-3 text-sm" key={item.id}>
                <p>
                  <AdminTime value={item.occurredAt} /> · {item.operation} ·{" "}
                  {item.category}
                  {item.source === "browser_report"
                    ? " · browser-reported, not independently verified"
                    : ""}
                </p>
                <p>
                  {item.userId ? (
                    <Link
                      className="underline"
                      href={`/admin/users/${item.userId}?includeExcluded=${includeExcluded ? "1" : "0"}`}
                    >
                      {item.email ?? "Account"}
                    </Link>
                  ) : (
                    "Account unavailable"
                  )}{" "}
                  · Interview:{" "}
                  <span className="break-all">
                    {item.interviewId ?? "Not created / unavailable"}
                  </span>
                </p>
                <p className="break-all">
                  Request: {item.requestId} · Reference: {item.referenceId}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
