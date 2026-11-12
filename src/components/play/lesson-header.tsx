import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import styles from "./lesson.module.css";
export function LessonHeader({
  topic,
  completed,
  total,
  combo,
}: {
  topic: string;
  completed: number;
  total: number;
  combo: number;
}) {
  return (
    <header className={styles.header}>
      <Link
        href={`/play/${topic}`}
        aria-label="Close round"
        className={styles.close}
      >
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </Link>
      <div
        className={styles.progress}
        role="progressbar"
        aria-label="Round progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
      >
        <span
          key={completed}
          style={{ transform: `scaleX(${completed / total})` }}
        />
      </div>
      {combo >= 2 && (
        <span className={styles.combo} aria-label={`Combo: ${combo}`}>
          {combo} in a row
        </span>
      )}
      <div className={styles.theme}>
        <ThemeToggle />
      </div>
    </header>
  );
}
