import { notFound } from "next/navigation";
import Link from "next/link";
import { playAccountId } from "@/lib/play/access";
import { playTopic, levelsForTopic } from "@/lib/play/catalog";
import { playerSnapshot } from "@/lib/play/player";
import { StartRound } from "@/components/play/start-round";
import { LevelPath } from "@/components/play/level-path";
import styles from "@/components/play/level-path.module.css";
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
    <>
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
      <div className={styles.placement}>
        <StartRound
          topic={id}
          mode="placement"
          label="Skip ahead"
          variant="link"
        />
        <p>Placement takes about 5 minutes.</p>
      </div>
      <LevelPath topic={id} levels={levels} passed={passed} />
    </>
  );
}
