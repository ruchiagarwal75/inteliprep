import { MockPrompt } from "./mock-prompt";
import Link from "next/link";
import type { RoundSummary } from "@/lib/play/public";
import { Celebration } from "./celebration";
import { StartRound } from "./start-round";
import { PassConfetti } from "./pass-confetti";
import styles from "./round-summary.module.css";
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
    <section
      className={`practice-surface ${styles.card}`}
      aria-label="Round results"
    >
      {summary.passed && <PassConfetti />}
      <h1>{title}</h1>
      <div className={styles.numbers}>
        <p className={styles.score}>
          {summary.correct} of {summary.total}
          <span> correct</span>
        </p>
        {summary.pointsEarned !== undefined && (
          <p className={styles.points}>
            {summary.pointsEarned}
            <span> points earned this round</span>
          </p>
        )}
      </div>
      {summary.bonusPoints > 0 && (
        <p>Includes +{summary.bonusPoints} for your first-try pass.</p>
      )}
      {summary.earnedBadges.length > 0 && (
        <Celebration title="New badges" badges={summary.earnedBadges} />
      )}
      {summary.passedLevels.length > 0 && (
        <p>Levels cleared: {summary.passedLevels.join(", ")}</p>
      )}
      {summary.retryDrills.length > 0 && (
        <div className={styles.review}>
          <h2>Drills to review</h2>
          <ul>
            {summary.retryDrills.map((drill) => (
              <li key={drill.drillId}>{drill.title}</li>
            ))}
          </ul>
        </div>
      )}
      {summary.mockPrompt && <MockPrompt {...summary.mockPrompt} />}
      <div className={styles.actions}>
        {summary.passed && summary.nextLevel ? (
          <StartRound
            topic={summary.topic}
            mode="level"
            level={summary.nextLevel.level}
            label={`Start Level ${summary.nextLevel.level}`}
          />
        ) : summary.mode === "level" && summary.level !== null ? (
          <StartRound
            topic={summary.topic}
            mode="level"
            level={summary.level}
            label={summary.passed ? "Replay level" : "Try again"}
          />
        ) : null}
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
