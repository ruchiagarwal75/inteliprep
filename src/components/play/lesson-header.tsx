import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SegmentedBar, type BlockState } from "./segmented-bar";
import { PixelSprite } from "./pixel-sprite";
import { PIXEL_ART } from "./pixel-art";
import styles from "./lesson.module.css";
export function LessonHeader({
  topic,
  completed,
  total,
  combo,
  outcomes,
}: {
  topic: string;
  completed: number;
  total: number;
  combo: number;
  outcomes?: readonly (boolean | null)[];
}) {
  const states: BlockState[] = Array.from({ length: total }, (_, i) =>
    outcomes?.[i] === true
      ? "correct"
      : outcomes?.[i] === false
        ? "wrong"
        : i < completed
          ? "done"
          : "empty",
  );
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
      <SegmentedBar
        label="Round progress"
        value={completed}
        max={total}
        states={states}
      />
      {combo >= 2 && (
        <span
          className={styles.combo}
          aria-label={`Combo: ${combo}`}
          data-game-label
        >
          <PixelSprite art={PIXEL_ART.flame} width="14" height="18" />
          {combo} in a row
        </span>
      )}
      <div className={styles.theme}>
        <ThemeToggle />
      </div>
    </header>
  );
}
