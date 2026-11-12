"use client";
import { useEffect, useRef, useState } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";
import { courseLessonSchema } from "@/lib/play/course/slides-public";
import type { CourseLesson } from "@/lib/play/course/slides-public";
import { CourseSlides } from "./course-slides";
import styles from "./course-slides-overlay.module.css";
type Load =
  | { kind: "loading" }
  | { kind: "ready"; lesson: CourseLesson }
  | { kind: "error" };
export function CourseSlidesOverlay({
  level,
  onClose,
}: {
  level: number;
  onClose: () => void;
}) {
  const { request } = useCandidateAccount();
  const dialog = useRef<HTMLDialogElement>(null);
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    async function read() {
      try {
        const response = await request(`/api/play/slides?level=${level}`, {
          cache: "no-store",
          signal: abort.signal,
        });
        if (!response.ok) throw Error("Slides unavailable");
        const data: unknown = await response.json();
        const lesson = courseLessonSchema.parse(data);
        if (!abort.signal.aborted) setLoad({ kind: "ready", lesson });
      } catch {
        if (!abort.signal.aborted) setLoad({ kind: "error" });
      }
    }
    void read();
    return () => abort.abort();
  }, [level, request, retry]);
  return (
    <dialog
      ref={dialog}
      role="dialog"
      className={styles.dialog}
      aria-labelledby="course-slides-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className={styles.header}>
        <h2 id="course-slides-title">Topic {level} slides</h2>
        <button
          autoFocus
          type="button"
          className="practice-secondary"
          aria-label="Close slides"
          onClick={onClose}
        >
          Close
        </button>
      </header>
      <div className={styles.body}>
        {load.kind === "loading" && <p role="status">Loading slides...</p>}
        {load.kind === "error" && (
          <div role="alert">
            <p>Could not load the slides. Your answer is kept.</p>
            <button
              type="button"
              className="practice-secondary"
              onClick={() => {
                setLoad({ kind: "loading" });
                setRetry((value) => value + 1);
              }}
            >
              Retry
            </button>
          </div>
        )}
        {load.kind === "ready" && (
          <CourseSlides {...load.lesson} review={{ onClose }} />
        )}
      </div>
    </dialog>
  );
}
