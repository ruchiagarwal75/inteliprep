"use client";
import { useEffect, useState } from "react";
import { markRoundReady } from "./round-prefetch";
import { DRILL_TYPE_LABELS } from "@/lib/play/public";
import type {
  DrillAnswer,
  DrillQuestion,
  DrillResult,
} from "@/lib/play/public";
import { SoftTimer } from "./soft-timer";
import { LessonHeader } from "./lesson-header";
import { AnswerSheet } from "./answer-sheet";
import { DrillAnswerForm } from "./drill-answer-form";
import { CourseSlidesOverlay } from "./course-slides-overlay";
import styles from "./drill.module.css";
export function DrillCard({
  topic,
  combo,
  question,
  result,
  busy,
  error,
  onAnswer,
  onNext,
  onRetry,
  onRefresh,
  resumed,
  outcomes,
  animatePoints,
}: {
  topic: string;
  combo: number;
  question: DrillQuestion;
  result?: DrillResult;
  busy: boolean;
  error?: string;
  onAnswer: (answer: DrillAnswer) => void;
  onNext: () => void;
  onRetry?: () => void;
  onRefresh?: () => void;
  resumed?: boolean;
  outcomes?: (boolean | null)[];
  animatePoints?: boolean;
}) {
  const [slidesOpen, setSlidesOpen] = useState(false);
  useEffect(() => {
    markRoundReady();
  }, [question.attemptId]);
  const completed =
    outcomes?.filter((row) => row !== null).length ??
    question.ordinal + (result ? 1 : 0);
  return (
    <div
      className={styles.lesson}
      data-lesson
      data-wrong={result && !result.correct ? true : undefined}
    >
      <LessonHeader
        topic={topic}
        completed={completed}
        total={question.total}
        combo={combo}
        outcomes={outcomes}
        onSlides={question.courseKind ? () => setSlidesOpen(true) : undefined}
      />
      <article
        data-drill-card
        className={`practice-surface ${styles.card}`}
        data-result={result ? true : undefined}
      >
        <header className={styles.header}>
          <p>
            {question.courseKind
              ? { concept: "Concept", flaw: "Spot the flaw", math: "Math" }[
                  question.courseKind
                ]
              : DRILL_TYPE_LABELS[question.type]}{" "}
            · {question.ordinal + 1} of {question.total}
          </p>
          <SoftTimer
            onRefresh={onRefresh}
            question={question}
            result={result}
            resumed={resumed}
            busy={busy || Boolean(onRetry)}
            paused={slidesOpen}
          />
        </header>
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
        {!result &&
          (onRetry ? (
            <p>Your answer is saved. Retry grading to continue.</p>
          ) : (
            <DrillAnswerForm
              question={question}
              busy={busy || Boolean(onRetry)}
              onAnswer={onAnswer}
            />
          ))}
      </article>
      {result && (
        <AnswerSheet
          question={question}
          result={result}
          animate={animatePoints}
          onNext={onNext}
        />
      )}
      {slidesOpen && (
        <CourseSlidesOverlay
          level={question.level}
          onClose={() => setSlidesOpen(false)}
        />
      )}
    </div>
  );
}
