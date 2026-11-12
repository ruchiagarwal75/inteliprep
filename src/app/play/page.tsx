import Link from "next/link";
import { playAccountId } from "@/lib/play/access";
import { PLAY_TOPICS } from "@/lib/play/catalog";
import { PlayShell } from "@/components/play/play-shell";
import { BRAND } from "@/lib/brand";
import styles from "@/components/play/play.module.css";
export const dynamic = "force-dynamic";
export default async function PlayPage() {
  const userId = await playAccountId();
  return (
    <PlayShell userId={userId}>
      <h1>{BRAND.tagline}</h1>
      <p>Choose a topic. Each round takes 3 to 5 minutes.</p>
      <ul className={styles.topicList}>
        {PLAY_TOPICS.map((topic) => (
          <li
            key={topic.id}
            className={`${styles.topic} ${!topic.available ? styles.locked : ""}`}
          >
            <div>
              <h2>{topic.title}</h2>
              <p>{topic.description}</p>
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
    </PlayShell>
  );
}
