import { LockIcon } from "@/components/play/game-icons";
import { notFound } from "next/navigation";
import Link from "next/link";
import { playAccountId } from "@/lib/play/access";
import { playTopic, levelsForTopic } from "@/lib/play/catalog";
import { playerSnapshot } from "@/lib/play/player";
import { levelUnlocked } from "@/lib/play/round-rules";
import { PlayShell } from "@/components/play/play-shell";
import { StartRound } from "@/components/play/start-round";
import styles from "@/components/play/play.module.css";
export const dynamic = "force-dynamic";
export default async function TopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const userId = await playAccountId(),
    { topic: id } = await params,
    topic = playTopic(id);
  if (!topic?.available) notFound();
  const snapshot = await playerSnapshot(userId),
    levels = levelsForTopic(id),
    passed = snapshot.levels
      .filter((row) => row.topic === id && row.status === "passed")
      .map((row) => row.level),
    reviews = snapshot.reviews.find((row) => row.topic === id)?.count ?? 0;
  return (
    <PlayShell userId={userId} snapshot={snapshot}>
      <Link className="practice-link" href="/play">
        All topics
      </Link>
      <h1>{topic.title}</h1>
      <p>Build one skill at a time.</p>
      {reviews > 0 && (
        <section className="practice-surface">
          <h2>Review</h2>
          <p>
            {reviews} {reviews === 1 ? "drill is" : "drills are"} due.
          </p>
          <StartRound topic={id} mode="review" label="Start review" />
        </section>
      )}
      <section className={styles.intro}>
        <h2>Find your starting point</h2>
        <p>
          Optional placement takes about 5 minutes. Try 2 drills from each of
          the first 3 levels.
        </p>
        <StartRound topic={id} mode="placement" label="Try placement" />
      </section>
      <ul className={styles.topicList}>
        {levels.map((level, index) => (
          <li className={styles.topic} key={level.level}>
            <div>
              <h2>
                {level.level}. {level.title}
              </h2>
              <p>5 drills. Pass with 4 correct answers.</p>
              <span className={styles.chip}>
                {passed.includes(level.level)
                  ? "Passed"
                  : levelUnlocked(level.level, levels, passed)
                    ? "Open"
                    : "Locked"}
              </span>
            </div>
            {levelUnlocked(level.level, levels, passed) ? (
              <StartRound
                topic={id}
                mode="level"
                level={level.level}
                label={
                  passed.includes(level.level) ? "Replay level" : "Start level"
                }
              />
            ) : (
              <p>
                <LockIcon /> Pass Level {levels[index - 1]?.level} to unlock
              </p>
            )}
          </li>
        ))}
      </ul>
    </PlayShell>
  );
}
