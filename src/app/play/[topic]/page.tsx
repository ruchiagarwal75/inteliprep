import { notFound } from "next/navigation";
import Link from "next/link";
import { playAccountId } from "@/lib/play/access";
import { playTopic, levelsForTopic } from "@/lib/play/catalog";
import { playerSnapshot } from "@/lib/play/player";
import { StartRound } from "@/components/play/start-round";
import { LevelPath } from "@/components/play/level-path";
import { WorldBanner } from "@/components/play/world-banner";
import styles from "@/components/play/level-path.module.css";
export const dynamic = "force-dynamic";
export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ unlocked?: string }>;
}) {
  const userId = await playAccountId(),
    { topic: id } = await params,
    topic = playTopic(id);
  if (!topic?.available) notFound();
  const reveal = Number((await searchParams).unlocked);
  const snapshot = await playerSnapshot(userId),
    levels = levelsForTopic(id),
    passed = snapshot.levels
      .filter((row) => row.topic === id && row.status === "passed")
      .map((row) => row.level),
    reviews = snapshot.reviews.find((row) => row.topic === id)?.count ?? 0;
  return (
    <>
      <Link className="practice-link" href="/play">
        All worlds
      </Link>
      <WorldBanner
        title={topic.title}
        stars={snapshot.levels
          .filter((row) => row.topic === id)
          .reduce((sum, row) => sum + row.best_stars, 0)}
        levelsPassed={passed.length}
        totalLevels={levels.length}
      />
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
      <LevelPath
        topic={id}
        revealLevel={Number.isSafeInteger(reveal) ? reveal : undefined}
        levels={levels}
        passed={passed}
        chests={Object.fromEntries(
          snapshot.chests
            .filter((row) => row.topic === id)
            .map((row) => [row.after_level, row.xp]),
        )}
        stars={Object.fromEntries(
          snapshot.levels
            .filter((row) => row.topic === id)
            .map((row) => [row.level, row.best_stars]),
        )}
      />
    </>
  );
}
