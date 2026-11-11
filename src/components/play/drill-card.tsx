"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DRILL_TYPE_LABELS } from "@/lib/play/public";
import type {
  DrillAnswer,
  DrillQuestion,
  DrillResult,
} from "@/lib/play/public";
import { DrillAnswerForm } from "./drill-answer-form";
import styles from "./drill.module.css";
function SoftTimer({
  question,
  result,
}: {
  question: DrillQuestion;
  result?: DrillResult;
}) {
  const [offset] = useState(() => Date.parse(question.serverNow) - Date.now()),
    [now, setNow] = useState(() => Date.parse(question.serverNow));
  useEffect(() => {
    if (result) return;
    const timer = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(timer);
  }, [offset, result]);
  const seconds = Math.max(
    0,
    Math.floor(
      (result ? result.timeMs : now - Date.parse(question.startedAt)) / 1000,
    ),
  );
  return (
    <span className={styles.timer} aria-label="Time on this drill">
      {String(Math.floor(seconds / 60)).padStart(2, "0")}:
      {String(seconds % 60).padStart(2, "0")}
      <span> No hard stop</span>
    </span>
  );
}
export function DrillCard({
  question,
  result,
  busy,
  error,
  onAnswer,
  onNext,
  onRetry,
}: {
  question: DrillQuestion;
  result?: DrillResult;
  busy: boolean;
  error?: string;
  onAnswer: (answer: DrillAnswer) => void;
  onNext: () => void;
  onRetry?: () => void;
}) {
  return (
    <article className={`practice-surface ${styles.card}`}>
      <header className={styles.header}>
        <p>
          {DRILL_TYPE_LABELS[question.type]} · {question.ordinal + 1} of{" "}
          {question.total}
        </p>
        <SoftTimer question={question} result={result} />
      </header>
      <progress
        className={styles.progress}
        max={question.total}
        value={question.ordinal + (result ? 1 : 0)}
        aria-label="Round progress"
      />
      <h1>{question.title}</h1>
      <p className={styles.prompt}>{question.prompt}</p>
      {error && (
        <div role="alert" className={styles.error}>
          <p>{error}</p>
          {onRetry && (
            <button
              className="practice-secondary"
              disabled={busy}
              onClick={onRetry}
            >
              Retry grading
            </button>
          )}
        </div>
      )}
      {result ? (
        <section className={styles.result} aria-label="Drill result">
          <h2>{result.correct ? "Correct" : "Try this again"}</h2>
          <p>{result.feedback}</p>
          <p className={styles.points}>+{result.points} points</p>
          {result.expected && (
            <p>
              <strong>Answer:</strong> {result.expected}
            </p>
          )}
          <details open className={styles.why}>
            <summary>Why</summary>
            <p>{result.why}</p>
            {result.formula && (
              <p>
                <code>{result.formula}</code>
              </p>
            )}
            {question.gapHref && (
              <Link className="practice-link" href={question.gapHref}>
                Read the gap card
              </Link>
            )}
          </details>
          <button
            className="practice-primary"
            type="button"
            disabled={busy}
            onClick={onNext}
          >
            Continue
          </button>
        </section>
      ) : onRetry ? (
        <p>Your answer is saved. Retry grading to continue.</p>
      ) : (
        <DrillAnswerForm question={question} busy={busy} onAnswer={onAnswer} />
      )}
    </article>
  );
}
