import { notFound } from "next/navigation";
import Link from "next/link";
import { playAccountId } from "@/lib/play/access";
import { playTopic, RAG_LEVELS } from "@/lib/play/catalog";
import { PlayShell } from "@/components/play/play-shell";
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
  return (
    <PlayShell userId={userId}>
      <Link className="practice-link" href="/play">
        All topics
      </Link>
      <h1>{topic.title}</h1>
      <p>Build one skill at a time.</p>
      <p className={styles.note}>
        Sample beta content. Every question is marked [sample].
      </p>
      <ul className={styles.topicList}>
        {RAG_LEVELS.map((level) => (
          <li className={styles.topic} key={level.level}>
            <div>
              <h2>
                {level.level}. {level.title}
              </h2>
              <p>5 drills. Pass with 4 correct answers.</p>
            </div>
            <span className={styles.chip}>
              {level.level === 1
                ? "First level"
                : `After level ${level.level - 1}`}
            </span>
          </li>
        ))}
      </ul>
    </PlayShell>
  );
}
