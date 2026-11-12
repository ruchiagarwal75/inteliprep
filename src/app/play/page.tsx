import Link from "next/link";
import { playAccountId } from "@/lib/play/access";
import { playerSnapshot } from "@/lib/play/player";
import { PLAY_TOPICS } from "@/lib/play/catalog";
import { BRAND } from "@/lib/brand";
import styles from "@/components/play/play.module.css";
export const dynamic = "force-dynamic";
export default async function PlayPage() {
  const userId = await playAccountId();
  let snapshot: Awaited<ReturnType<typeof playerSnapshot>> | undefined;
  try {
    snapshot = await playerSnapshot(userId);
  } catch {
    /* The shell reports progress failure without blocking Mock. */
  }
  return (
    <>
      <h1>{BRAND.tagline}</h1>
      <p>Choose a topic. Each round takes 3 to 5 minutes.</p>
      <ul className={styles.topicList}>
        {PLAY_TOPICS.map((topic) => (
          <li
            key={topic.id}
            data-world={topic.id}
            className={`${styles.topic} ${!topic.available ? styles.locked : ""}`}
          >
            <div>
              <h2>{topic.title}</h2>
              <p>{topic.description}</p>
              {topic.available && (
                <p className={styles.starTotal}>
                  {snapshot
                    ? `${snapshot.levels.filter((row) => row.topic === topic.id).reduce((sum, row) => sum + row.best_stars, 0)} / ${topic.levels.length * 3} stars`
                    : "Stars unavailable"}
                </p>
              )}
            </div>
            {topic.available ? (
              <Link className="practice-primary" href={`/play/${topic.id}`}>
                Play {topic.title}
              </Link>
            ) : (
              <span className={styles.chip}>Coming soon</span>
            )}
          </li>
        ))}
      </ul>
      <Link className="practice-link" href="/mock#fundamentals">
        Fundamentals: the 8 classic system design problems
      </Link>
    </>
  );
}
