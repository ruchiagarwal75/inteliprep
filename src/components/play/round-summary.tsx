"use client";
import {
  RAG_COURSE_ID,
  playWorldHref,
  courseTopicHref,
} from "@/lib/play/course/metadata";
import Link from "next/link";
import type { RoundSummary } from "@/lib/play/public";
import { formatDrillTime } from "@/lib/play/drill-time";
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
  const course = summary.topic === RAG_COURSE_ID;
  const title =
    summary.mode === "level"
      ? summary.passed
        ? course
          ? "Topic passed"
          : "Level passed"
        : "Keep practicing"
      : summary.mode === "placement"
        ? "Placement complete"
        : "Review complete";

  const next =
    course && summary.earnedBadges.includes("rag-rookie")
      ? "?unlocked=1&primer=1"
      : summary.nextLevel
        ? `?unlocked=${summary.nextLevel.level}`
        : "";
  return (
    <section className={styles.complete} aria-label="Round results" data-lesson>
      <header className={styles.top}>
        <Link className="practice-link" href={playWorldHref(summary.topic)}>
          {course ? "Back to topics" : "Back to levels"}
        </Link>
        <ThemeToggle />
      </header>
      <div className={styles.body}>
        {summary.passed && <PassConfetti />}
        <GameGuide
          size="large"
          pose={summary.passed ? "celebrate" : "encourage"}
        />
        <h1 data-game-label>{title}</h1>
        {summary.levelTitle && (
          <p className={styles.levelName}>{summary.levelTitle}</p>
        )}
        {summary.mode === "level" && summary.stars !== undefined && (
          <div className={styles.stars}>
            <Stars count={summary.stars} animate />
          </div>
        )}
        {summary.mode === "level" && !summary.passed && (
          <p className={styles.retry} data-game-label>
            {summary.correct} of {summary.total}. Get{" "}
            {course ? Math.ceil(summary.total * 0.75) : 4} to pass.
          </p>
        )}
        {summary.pointsEarned !== undefined && (
          <p className={styles.xp} data-game-label>
            <CountedXp value={summary.pointsEarned} />
          </p>
        )}
        {summary.replay && <p>Replay: half XP.</p>}
        {summary.bonusPoints > 0 && (
          <p className={styles.bonus}>
            Includes +{summary.bonusPoints} XP for your first-try pass.
          </p>
        )}
        <dl className={styles.stats}>
          <div>
            <dt>Accuracy</dt>
            <dd data-game-label>
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
            <dd data-game-label>
              {summary.answerTimeMs === undefined
                ? "Unavailable"
                : formatDrillTime(summary.answerTimeMs)}
            </dd>
          </div>
          <div>
            <dt>Best combo</dt>
            <dd data-game-label>{summary.bestCombo ?? "Unavailable"}</dd>
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
              href={`${playWorldHref(summary.topic)}${next}`}
              onClick={() => {
                prepareGameSounds();
                if (summary.passed) playGameSound("complete");
              }}
            >
              Continue
            </Link>
          )}
          {course && (
            <Link
              className="practice-secondary"
              href={
                summary.level === null
                  ? "/play/rag/notebook"
                  : `/play/rag/notebook?topic=${summary.level}`
              }
            >
              Notebook
            </Link>
          )}
          {course && summary.level !== null && (
            <Link
              className="practice-secondary"
              href={courseTopicHref(summary.level)}
            >
              Review slides
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
