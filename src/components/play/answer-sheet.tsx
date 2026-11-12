"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import type { DrillQuestion, DrillResult } from "@/lib/play/public";
import { GameGuide } from "./game-guide";
import { EarnedPoints } from "./earned-points";
import { Celebration } from "./celebration";
import { playGameSound } from "./game-sounds";
import styles from "./lesson.module.css";
export function AnswerSheet({
  question,
  result,
  animate,
  onNext,
}: {
  question: DrillQuestion;
  result: DrillResult;
  animate?: boolean;
  onNext: () => void;
}) {
  const next = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    next.current?.focus({ preventScroll: true });
    if (animate) playGameSound(result.correct ? "correct" : "wrong");
  }, [result.correct, animate]);
  const heading = result.correct
    ? ["Nice!", "Exactly.", "Sharp."][question.ordinal % 3]
    : "Not quite";
  return (
    <section
      className={styles.sheet}
      data-correct={result.correct}
      aria-label="Drill result"
    >
      <div className={styles.sheetTop}>
        <GameGuide pose={result.correct ? "cheer" : "encourage"} />
        <div>
          <h2>{heading}</h2>
          {result.correct ? (
            <EarnedPoints
              points={result.points + (result.comboBonus ?? 0)}
              animate={animate}
            />
          ) : (
            <p>Good try. This one comes back in 2 days.</p>
          )}
        </div>
      </div>
      {(result.comboBonus ?? 0) > 0 && (
        <p className={styles.burst} role="status">
          {result.combo} in a row! +{result.comboBonus} XP
        </p>
      )}
      <p>{result.feedback}</p>
      {!result.correct && result.expected && (
        <p className={styles.answer}>
          <strong>Answer:</strong> {result.expected}
        </p>
      )}
      {result.badgesEarned.length > 0 && (
        <Celebration title="Badge earned" badges={result.badgesEarned} />
      )}
      <details open={!result.correct} className={styles.why}>
        <summary>Why</summary>
        <p>{result.why}</p>
        {result.correct && result.expected && (
          <p>
            <strong>Answer:</strong> {result.expected}
          </p>
        )}
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
        ref={next}
        className="practice-primary"
        type="button"
        onClick={onNext}
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.repeat) event.preventDefault();
        }}
      >
        Continue
      </button>
      <p className={styles.hint}>Enter to continue.</p>
    </section>
  );
}
