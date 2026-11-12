"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";
import { RAG_COURSE_ID } from "@/lib/play/course/metadata";
import { StartRound } from "./start-round";
import { CourseSlideSaves } from "./course-slide-saves";
import { CourseSlideFrame } from "./course-slide-frame";
import { useSlideKeys } from "./slide-keys";
import type { CourseLesson } from "@/lib/play/course/slides-public";
import styles from "./course.module.css";
const SAVE_ERROR =
  "Could not save your place. You can keep reading, then retry saving before the quiz.";
export function CourseSlides({
  level,
  title,
  slides,
  complete,
  seenThrough,
  lastViewedIndex,
  review,
}: CourseLesson & { review?: { onClose: () => void } }) {
  const { request } = useCandidateAccount();
  const initialIndex = review ? lastViewedIndex : 0;
  const [index, setIndex] = useState(initialIndex),
    [error, setError] = useState("");
  const next = useRef<HTMLDivElement>(null),
    reader = useRef<HTMLElement>(null),
    currentIndex = useRef(initialIndex),
    mounted = useRef(false);
  const slide = slides[index],
    last = index === slides.length - 1;
  const [saves] = useState(
    () =>
      new CourseSlideSaves({
        seenThrough,
        lastViewedIndex,
        save: async (visited, position) => {
          const response = await request("/api/play/slides", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              level,
              index: visited,
              lastViewedIndex: position,
            }),
            signal: AbortSignal.timeout(15000),
          });
          if (!response.ok) throw Error("Slide not saved");
        },
      }),
  );
  const saveProgress = useCallback(
    (visited: number) => {
      setError("");
      void saves.visit(visited).catch(() => {
        if (mounted.current) setError(SAVE_ERROR);
      });
    },
    [saves],
  );
  const move = useCallback(
    (index: number) => {
      const value = Math.max(0, Math.min(slides.length - 1, index));
      currentIndex.current = value;
      setIndex(value);
      saveProgress(value);
    },
    [slides.length, saveProgress],
  );
  useEffect(() => {
    mounted.current = true;
    void saves.visit(currentIndex.current).catch(() => {
      if (mounted.current) setError(SAVE_ERROR);
    });
    return () => {
      mounted.current = false;
    };
  }, [saves]);
  const moveBy = useCallback(
    (direction: number) => move(currentIndex.current + direction),
    [move],
  );
  useSlideKeys({ reader, primary: next, move: moveBy });
  return (
    <section
      ref={reader}
      className={styles.lesson}
      data-review={review ? "true" : undefined}
      aria-label="Topic slides"
    >
      {!review && (
        <Link className="practice-link" href="/play/rag">
          Back to topics
        </Link>
      )}
      <p data-game-label>Topic {level} · Learn</p>
      <h1 data-game-label>{title}</h1>
      {!review && complete && !last && (
        <div className={styles.quick}>
          <StartRound
            topic={RAG_COURSE_ID}
            mode="level"
            level={level}
            label="Start quiz"
          />
          <span>Or review the slides below.</span>
        </div>
      )}
      {slide && (
        <CourseSlideFrame slide={slide} index={index} count={slides.length} />
      )}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="practice-secondary"
            onClick={() => saveProgress(currentIndex.current)}
          >
            Retry save
          </button>
        </div>
      )}
      <div ref={next} className={styles.controls}>
        <button
          type="button"
          className={`practice-secondary ${styles.back}`}
          disabled={index === 0}
          onClick={() => move(currentIndex.current - 1)}
        >
          Back
        </button>
        {last && review ? (
          <button
            type="button"
            className="practice-primary"
            onClick={review.onClose}
          >
            Back to quiz
          </button>
        ) : last ? (
          <StartRound
            topic={RAG_COURSE_ID}
            mode="level"
            level={level}
            label="Start quiz"
            beforeStart={() => saves.visit(slides.length - 1)}
          />
        ) : (
          <button
            type="button"
            className="practice-primary"
            onClick={() => move(currentIndex.current + 1)}
          >
            Next
          </button>
        )}
      </div>
      <p>Arrow keys to move. Enter to continue.</p>
    </section>
  );
}
