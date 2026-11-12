"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";
import { RAG_COURSE_ID } from "@/lib/play/course/metadata";
import { StartRound } from "./start-round";
import { CourseSlideSaves } from "./course-slide-saves";
import styles from "./course.module.css";
type Slide = { title: string; lines: string[] };
const SAVE_ERROR =
  "Could not save your place. You can keep reading, then retry saving before the quiz.";
export function CourseSlides({
  level,
  title,
  slides,
  complete,
  seenThrough,
}: {
  level: number;
  title: string;
  slides: Slide[];
  complete: boolean;
  seenThrough: number;
}) {
  const { request } = useCandidateAccount();
  const [index, setIndex] = useState(0),
    [error, setError] = useState("");
  const next = useRef<HTMLDivElement>(null),
    currentIndex = useRef(0),
    mounted = useRef(false);
  const slide = slides[index],
    last = index === slides.length - 1;
  const [saves] = useState(
    () =>
      new CourseSlideSaves(seenThrough, async (visited) => {
        const response = await request("/api/play/slides", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ level, index: visited }),
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw Error("Slide not saved");
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
    void saves.visit(0).catch(() => {
      if (mounted.current) setError(SAVE_ERROR);
    });
    return () => {
      mounted.current = false;
    };
  }, [saves]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.target instanceof HTMLElement &&
          event.target.closest(
            '[role="dialog"],[role="menu"],input,textarea,select,[contenteditable="true"]',
          ))
      )
        return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(currentIndex.current - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        move(currentIndex.current + 1);
      } else if (
        event.key === "Enter" &&
        event.target instanceof HTMLElement &&
        !event.target.closest("button,a,summary")
      ) {
        event.preventDefault();
        next.current
          ?.querySelector<HTMLButtonElement>(".practice-primary")
          ?.click();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [move]);
  return (
    <section className={styles.lesson} aria-label="Topic slides">
      <Link className="practice-link" href="/play/rag">
        Back to topics
      </Link>
      <p data-game-label>Topic {level} · Learn</p>
      <h1 data-game-label>{title}</h1>
      {complete && !last && (
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
      <article
        className={`practice-surface ${styles.slide}`}
        aria-live="polite"
      >
        <p className={styles.counter} aria-label="Slide counter">
          {index + 1} / {slides.length}
        </p>
        <h2 data-game-label>{slide?.title}</h2>
        {slide?.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </article>
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
          className="practice-secondary"
          disabled={index === 0}
          onClick={() => move(currentIndex.current - 1)}
        >
          Back
        </button>
        {last ? (
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
