"use client";
import Link from "next/link";
import type { RoundSummary } from "@/lib/play/public";
import { ThemeToggle } from "@/components/theme-toggle";
import { MockPrompt } from "./mock-prompt";
import { Celebration } from "./celebration";
import { StartRound } from "./start-round";
import { PassConfetti } from "./pass-confetti";
import { GameGuide } from "./game-guide";
import { Stars } from "./stars";
import { CountedXp } from "./counted-xp";
import { prepareGameSounds, playGameSound } from "./game-sounds";
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
  const seconds =
    summary.answerTimeMs === undefined
      ? undefined
      : Math.floor(summary.answerTimeMs / 1000);
  const next = summary.nextLevel ? `?unlocked=${summary.nextLevel.level}` : "";
  return (
    <section className={styles.complete} aria-label="Round results" data-lesson>
      <header className={styles.top}>
        <Link className="practice-link" href={`/play/${summary.topic}`}>
          Back to levels
        </Link>
        <ThemeToggle />
      </header>
      <div className={styles.body}>
        {summary.passed && <PassConfetti />}
        <GameGuide pose={summary.passed ? "celebrate" : "encourage"} />
        <h1>{title}</h1>
        {summary.mode === "level" && summary.stars !== undefined && (
          <div className={styles.stars}>
            <Stars count={summary.stars} animate />
          </div>
        )}
        {summary.mode === "level" && !summary.passed && (
          <p className={styles.retry}>
            You got {summary.correct} of {summary.total}. Get 4 to pass.
          </p>
        )}
        {summary.pointsEarned !== undefined && (
          <p className={styles.xp}>
            <CountedXp value={summary.pointsEarned} />
          </p>
        )}
        {summary.bonusPoints > 0 && (
          <p className={styles.bonus}>
            Includes +{summary.bonusPoints} XP for your first-try pass.
          </p>
        )}
        <dl className={styles.stats}>
          <div>
            <dt>Accuracy</dt>
            <dd>
              {summary.total
                ? `${Math.round((summary.correct / summary.total) * 100)}%`
                : "Unavailable"}
              <small>
                {summary.correct} of {summary.total} correct
              </small>
            </dd>
          </div>
          <div>
            <dt>Answer time</dt>
            <dd>
              {seconds === undefined
                ? "Unavailable"
                : `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`}
            </dd>
          </div>
          <div>
            <dt>Best combo</dt>
            <dd>{summary.bestCombo ?? "Unavailable"}</dd>
          </div>
        </dl>
        {summary.earnedBadges.length > 0 && (
          <Celebration title="New badges" badges={summary.earnedBadges} />
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
          {summary.mode === "level" &&
          !summary.passed &&
          summary.level !== null ? (
            <StartRound
              topic={summary.topic}
              mode="level"
              level={summary.level}
              label="Try again"
            />
          ) : (
            <Link
              className="practice-primary"
              href={`/play/${summary.topic}${next}`}
              onClick={() => {
                prepareGameSounds();
                if (summary.passed) playGameSound("complete");
              }}
            >
              Continue
            </Link>
          )}
          <Link className="practice-link" href="/progress">
            Open Progress
          </Link>
        </div>
      </div>
    </section>
  );
}
