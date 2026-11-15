import Link from "next/link";
import { AdminTime } from "./admin-format";
import type { adminTopicRatings } from "@/lib/admin-topic-ratings";
import { playTopic, levelsForTopic } from "@/lib/play/catalog";

export function AdminTopicRatingsPanel({
  data,
}: {
  data: Awaited<ReturnType<typeof adminTopicRatings>> | null;
}) {
  return (
    <section
      aria-label="First topic quiz ratings"
      className="space-y-3 rounded-lg border p-4"
    >
      <h2 className="text-xl font-semibold">First topic quiz ratings</h2>
      {data ? (
        <>
          <p>
            {data.average === null
              ? "No ratings yet"
              : `${data.average} / 5 average`}{" "}
            · {data.shown} shown · {data.rated} rated · {data.skipped} skipped ·{" "}
            {data.closed} closed · {data.unanswered} with no response
          </p>
          {data.olderDismissals > 0 && (
            <p>
              {data.olderDismissals} older dismissals have no recorded reason.
            </p>
          )}
          <p className="text-sm">
            Most recent 20, using the email search and admin/test filters above.{" "}
            Shown means the popup was displayed in a visible tab. Older
            responses may have no display record.
          </p>
          {data.entries.map((entry) => (
            <article
              key={entry.id}
              data-topic-rating-id={entry.id}
              className="space-y-1 border-t pt-3"
            >
              <p>
                <Link
                  className="underline"
                  href={`/admin/users/${entry.userId}`}
                >
                  {entry.email ?? "Email unavailable"}
                </Link>{" "}
                · <AdminTime value={entry.createdAt} />
              </p>
              <p>
                {playTopic(entry.topic)?.title ?? entry.topic}:{" "}
                {levelsForTopic(entry.topic).find(
                  (level) => level.level === entry.level,
                )?.title ?? `Topic ${entry.level}`}
              </p>
              <p>
                {entry.outcome === "rated"
                  ? `${entry.stars} / 5 stars`
                  : {
                      skipped: "Skipped",
                      closed: "Closed with X or Escape",
                      older_dismissal: "Dismissed, reason not recorded",
                      unanswered: "Shown, no response recorded",
                    }[entry.outcome]}
              </p>
              <p className="text-sm">
                Popup shown:{" "}
                {entry.shownAt ? (
                  <AdminTime value={entry.shownAt} />
                ) : (
                  "Not recorded"
                )}
                {entry.respondedAt && (
                  <>
                    {" "}
                    · Response: <AdminTime value={entry.respondedAt} />
                  </>
                )}
              </p>
            </article>
          ))}
        </>
      ) : (
        <p>
          Topic ratings are unavailable. Check the rating migration and
          reporting database.
        </p>
      )}
    </section>
  );
}
