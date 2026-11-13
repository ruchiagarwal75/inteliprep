import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { RAG_COURSE_ID } from "@/lib/play/course/metadata";
import { SegmentedBar } from "./segmented-bar";
import { StartRound } from "./start-round";
import styles from "./course.module.css";
export function CourseLearnHeader({
  level,
  title,
  index,
  count,
  complete,
}: {
  level: number;
  title: string;
  index: number;
  count: number;
  complete: boolean;
}) {
  return (
    <header className={styles.heading} data-learn-header>
      <Link
        className={styles.close}
        href="/play/rag"
        aria-label="Back to topics"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </Link>
      <h1 data-game-label title={`Topic ${level} · ${title}`}>
        Topic {level} · {title}
      </h1>
      <div className={styles.quiz}>
        {complete && (
          <StartRound
            topic={RAG_COURSE_ID}
            mode="level"
            level={level}
            label="Start quiz"
            variant="secondary"
          />
        )}
      </div>
      <ThemeToggle />
      <div className={styles.progress}>
        <SegmentedBar
          label="Slide progress"
          value={index + 1}
          max={count}
          states={Array.from({ length: count }, (_, i) =>
            i <= index ? "done" : "empty",
          )}
        />
      </div>
    </header>
  );
}
