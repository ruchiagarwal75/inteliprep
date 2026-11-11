import Link from "next/link";
import type { RoundSummary } from "@/lib/play/public";
import { Celebration } from "./celebration";
import { StartRound } from "./start-round";
import styles from "./play.module.css";
export function RoundSummaryCard({ summary }: { summary: RoundSummary }) {
  const title =
    summary.mode === "level"
      ? summary.passed
        ? "Level passed"
        : "Keep practicing"
      : summary.mode === "placement"
        ? "Placement complete"
        : "Review complete";
  return (
    <section className="practice-surface" aria-label="Round results">
      <h1>{title}</h1>
      {(summary.passedLevels.length > 0 || summary.earnedBadges.length > 0) && (
        <Celebration
          title={
            summary.passedLevels.length > 0 ? "Level cleared" : "Badge earned"
          }
          badges={summary.earnedBadges}
        />
      )}
      {summary.bonusPoints > 0 && (
        <p>First-try pass: +{summary.bonusPoints} points</p>
      )}
      <p>
        {summary.correct} of {summary.total} correct
      </p>
      {summary.passedLevels.length > 0 && (
        <p>Levels cleared: {summary.passedLevels.join(", ")}</p>
      )}
      {summary.retryDrills.length > 0 && (
        <>
          <h2>Try these again</h2>
          <ul>
            {summary.retryDrills.map((drill) => (
              <li key={drill.drillId}>{drill.title}</li>
            ))}
          </ul>
        </>
      )}
      <div className={styles.actions}>
        {summary.mode === "level" && summary.level !== null && (
          <StartRound
            topic={summary.topic}
            mode="level"
            level={summary.level}
            label="Replay level"
          />
        )}
        <Link className="practice-secondary" href={`/play/${summary.topic}`}>
          Back to levels
        </Link>
        <Link className="practice-link" href="/progress">
          Open Progress
        </Link>
      </div>
    </section>
  );
}
