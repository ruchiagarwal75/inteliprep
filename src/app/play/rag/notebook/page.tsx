import Link from "next/link";
import { notFound } from "next/navigation";
import { playAccountId } from "@/lib/play/access";
import { courseNotebook } from "@/lib/play/course/notebook";
import { RAG_COURSE_NODES } from "@/lib/play/course/metadata";
import { NotebookTopic } from "./notebook-topic";
import styles from "./notebook.module.css";
export const dynamic = "force-dynamic";
export default async function NotebookPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string | string[] }>;
}) {
  const selected = (await searchParams).topic;
  if (Array.isArray(selected)) notFound();
  const level = Number(selected ?? "0");
  if (!Number.isSafeInteger(level) || level < 0 || level > 9) notFound();
  const topic = await courseNotebook(await playAccountId(), level);
  return (
    <div className={styles.notebook}>
      <Link className="practice-link" href="/play/rag">
        Back to topics
      </Link>
      <h1 data-game-label>RAG notebook</h1>
      <p>Your slides and answered questions. Choose a topic to review.</p>
      <details key={level} className={styles.picker} data-topic-picker>
        <summary>
          Topic {topic.level}: {topic.title}
          <span>Change topic</span>
        </summary>
        <nav aria-label="Notebook topics">
          <ol>
            {RAG_COURSE_NODES.map((node) => (
              <li key={node.level}>
                <Link
                  href={"/play/rag/notebook?topic=" + node.level}
                  aria-current={node.level === level ? "page" : undefined}
                >
                  {node.level}. {node.title}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </details>
      <NotebookTopic key={level} topic={topic} />
      <nav aria-label="Next notebook topic" className={styles.paging}>
        {level > 0 && (
          <Link
            className="practice-secondary"
            href={"/play/rag/notebook?topic=" + (level - 1)}
          >
            Previous topic
          </Link>
        )}
        {level < 9 && (
          <Link
            className="practice-secondary"
            href={"/play/rag/notebook?topic=" + (level + 1)}
          >
            Next topic
          </Link>
        )}
      </nav>
    </div>
  );
}
