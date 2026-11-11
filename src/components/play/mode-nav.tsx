import Link from "next/link";
import styles from "./play.module.css";
export function ModeNav({
  active,
  points,
  streak,
}: {
  active: "play" | "mock" | "progress";
  points?: number;
  streak?: number;
}) {
  return (
    <div className={styles.modeBar}>
      <nav aria-label="Practice modes" className={styles.links}>
        {(["play", "mock", "progress"] as const).map((mode) => (
          <Link
            key={mode}
            href={`/${mode}`}
            aria-current={mode === active ? "page" : undefined}
          >
            {mode[0].toUpperCase() + mode.slice(1)}
          </Link>
        ))}
      </nav>
      <div className={styles.totals} aria-label="Your progress">
        <span>
          {streak === undefined ? "Streak unavailable" : `${streak}-day streak`}
        </span>
        <span>
          {points === undefined
            ? "Points unavailable"
            : `${points.toLocaleString()} points`}
        </span>
      </div>
    </div>
  );
}
