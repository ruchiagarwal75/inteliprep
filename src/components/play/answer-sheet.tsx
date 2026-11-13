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
  onSlides,
}: {
  question: DrillQuestion;
  result: DrillResult;
  animate?: boolean;
  onNext: () => void;
  onSlides?: () => void;
}) {
  const next = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLElement>(null);
  useEffect(() => {
    next.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
    if (animate) playGameSound(result.correct ? "correct" : "wrong");
  }, [result.correct, animate]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.key !== "Enter" ||
        event.repeat ||
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        document.querySelector("dialog[open]") ||
        !(target instanceof HTMLElement) ||
        target.closest(
          'button,a,input,textarea,select,summary,[role="dialog"],[role="menu"],[contenteditable="true"]',
        ) ||
        (target !== document.body && !sheet.current?.contains(target))
      )
        return;
      event.preventDefault();
      next.current?.click();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  // Older saved grades keep their original payload; suppress the retired nudge.
  const feedback =
    question.courseKind && result.feedback === "Take another look."
      ? ""
      : result.feedback;
  const heading = result.correct
    ? ["Nice!", "Exactly", "Sharp"][question.ordinal % 3]
    : "Not quite";
  return (
    <section
      ref={sheet}
      className={styles.sheet}
      data-correct={result.correct}
      aria-label="Drill result"
    >
      <div className={styles.sheetTop}>
        <GameGuide pose={result.correct ? "cheer" : "encourage"} />
        <div>
          <h2 data-game-label>{heading}</h2>
          {result.correct ? (
            <EarnedPoints
              points={result.points + (result.comboBonus ?? 0)}
              animate={animate}
            />
          ) : (
            <p>This one comes back for review in 2 days.</p>
          )}
        </div>
      </div>
      {(result.comboBonus ?? 0) > 0 && (
        <p className={styles.burst} role="status" data-game-label>
          {result.combo} in a row! +{result.comboBonus} XP
        </p>
      )}
      {result.keyIdea && (
        <p>
          <strong>{result.keyIdea}</strong>
        </p>
      )}
      {feedback && <p>{feedback}</p>}
      {(result.keyIdea || !result.correct) && result.expected && (
        <p className={styles.answer}>
          <strong>Answer:</strong> {result.expected}
        </p>
      )}
      {result.ifWrong && <p>{result.ifWrong}</p>}
      {!result.correct && onSlides && (
        <button type="button" className="practice-link" onClick={onSlides}>
          See slide {question.courseSlide ?? 1}
        </button>
      )}
      {result.badgesEarned.length > 0 && (
        <Celebration title="Badge earned" badges={result.badgesEarned} />
      )}
      <details
        open={Boolean(result.keyIdea) || !result.correct}
        className={styles.why}
      >
        <summary>Why</summary>
        <p>{result.why}</p>
        {!result.keyIdea && result.correct && result.expected && (
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
        data-game-label
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
