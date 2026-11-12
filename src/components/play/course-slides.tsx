"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";
import { RAG_COURSE_ID } from "@/lib/play/course/metadata";
import { StartRound } from "./start-round";
import styles from "./course.module.css";
type Slide = { title: string; lines: string[] };
export function CourseSlides({
  level,
  title,
  slides,
  complete,
}: {
  level: number;
  title: string;
  slides: Slide[];
  complete: boolean;
}) {
  const { request } = useCandidateAccount();
  const [index, setIndex] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const next = useRef<HTMLDivElement>(null),
    lock = useRef(false);
  const slide = slides[index],
    last = index === slides.length - 1;
  async function saveSlide() {
    const response = await request("/api/play/slides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, index }),
    });
    if (!response.ok) throw Error("Slide not saved");
  }
  async function advance() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await saveSlide();
      if (!last) setIndex((value) => value + 1);
    } catch {
      setError("Could not save your place. Please retry.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.target instanceof HTMLElement &&
          event.target.closest(
            '[role="dialog"],[role="menu"],input,textarea,select',
          ))
      )
        return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((value) => Math.max(0, value - 1));
      } else if (
        event.key === "ArrowRight" ||
        (event.key === "Enter" && event.target === document.body)
      ) {
        event.preventDefault();
        next.current
          ?.querySelector<HTMLButtonElement>(".practice-primary")
          ?.click();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
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
      {error && <p role="alert">{error}</p>}
      <div ref={next} className={styles.controls}>
        <button
          type="button"
          className="practice-secondary"
          disabled={index === 0 || busy}
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
        >
          Back
        </button>
        {last ? (
          <StartRound
            topic={RAG_COURSE_ID}
            mode="level"
            level={level}
            label="Start quiz"
            beforeStart={saveSlide}
          />
        ) : (
          <button
            type="button"
            className="practice-primary"
            disabled={busy}
            onClick={() => void advance()}
          >
            {busy ? "Saving..." : last ? "Start quiz" : "Next"}
          </button>
        )}
      </div>
      <p>Arrow keys to move. Enter to continue.</p>
    </section>
  );
}
