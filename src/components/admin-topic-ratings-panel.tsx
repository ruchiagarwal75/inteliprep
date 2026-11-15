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
            · {data.rated} rated · {data.skipped} skipped
          </p>
          <p className="text-sm">
            Most recent 20, using the email search and admin/test filters above.
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
              <p>{entry.skipped ? "Skipped" : `${entry.stars} / 5 stars`}</p>
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
