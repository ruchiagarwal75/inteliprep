import Link from "next/link";
import { playAccountId } from "@/lib/play/access";
import { playerSnapshot } from "@/lib/play/player";
import { PLAY_TOPICS } from "@/lib/play/catalog";
import { BRAND } from "@/lib/brand";
import { TopicIcon } from "@/components/play/topic-icon";
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
      <ul className={styles.topicList} aria-label="Practice worlds">
        {PLAY_TOPICS.map((topic) => {
          const progress = snapshot?.levels.filter(
              (row) => row.topic === topic.id,
            ),
            passed =
              progress?.filter((row) => row.status === "passed").length ?? 0,
            stars =
              progress?.reduce((sum, row) => sum + row.best_stars, 0) ?? 0;
          return (
            <li
              key={topic.id}
              data-world={topic.id}
              className={`${styles.topic} ${!topic.available ? styles.locked : ""}`}
            >
              <TopicIcon topic={topic.id} locked={!topic.available} />
              <div className={styles.topicCopy}>
                <h2>{topic.title}</h2>
                <p>{topic.description}</p>
                {topic.available &&
                  (snapshot ? (
                    <>
                      <div className={styles.worldStats}>
                        <p className={styles.starTotal}>
                          {stars} / {topic.levels.length * 3} stars
                        </p>
                        <p>
                          {passed} of {topic.levels.length} levels passed
                        </p>
                      </div>
                      <progress
                        className={styles.worldProgress}
                        max={topic.levels.length}
                        value={passed}
                        aria-label={`${topic.title} levels passed`}
                      />
                    </>
                  ) : (
                    <p>Progress unavailable</p>
                  ))}
              </div>
              {topic.available ? (
                <Link className="practice-primary" href={`/play/${topic.id}`}>
                  Play {topic.title}
                </Link>
              ) : (
                <span className={styles.chip}>Coming soon</span>
              )}
            </li>
          );
        })}
      </ul>
      <Link className="practice-link" href="/mock#fundamentals">
        Fundamentals: the 8 classic system design problems
      </Link>
    </>
  );
}
