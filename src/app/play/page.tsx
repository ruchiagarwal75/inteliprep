import { RAG_COURSE_ID, RAG_COURSE_NODES } from "@/lib/play/course/metadata";
import Link from "next/link";
import { playAccountId } from "@/lib/play/access";
import { playerSnapshot } from "@/lib/play/player";
import { PLAY_TOPICS } from "@/lib/play/catalog";
import { BRAND } from "@/lib/brand";
import { PixelSprite } from "@/components/play/pixel-sprite";
import { PIXEL_ART } from "@/components/play/pixel-art";
import { TopicIcon } from "@/components/play/topic-icon";
import styles from "@/components/play/play.module.css";
import { redirect } from "next/navigation";
import { welcomeRequired } from "@/lib/play/welcome-store";
export const dynamic = "force-dynamic";
export default async function PlayPage() {
  const userId = await playAccountId();
  if (await welcomeRequired(userId)) redirect("/play/welcome");
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
          const total =
            topic.id === "rag" ? RAG_COURSE_NODES.length : topic.levels.length;
          const progress = snapshot?.levels.filter(
              (row) =>
                row.topic === (topic.id === "rag" ? RAG_COURSE_ID : topic.id),
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
                        <p
                          className={styles.starTotal}
                          data-game-label
                          aria-label={`${stars} / ${total * 3} stars`}
                        >
                          <PixelSprite
                            art={PIXEL_ART.star}
                            width="18"
                            height="14"
                          />
                          {stars}/{total * 3}
                        </p>
                        <p>
                          {passed} of {total}{" "}
                          {topic.id === "rag" ? "topics" : "levels"} passed
                        </p>
                      </div>
                      <progress
                        className={styles.worldProgress}
                        max={total}
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
                <span
                  className={styles.chip}
                  data-game-label
                  aria-label="Coming soon"
                >
                  Soon
                </span>
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
