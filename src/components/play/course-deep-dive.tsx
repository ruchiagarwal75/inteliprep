"use client";
import { useCallback, useState } from "react";
import type { CourseSlide } from "@/lib/play/course/slides-public";
import { CourseDiagram } from "./course-diagram";
import { SlideBody } from "./slide-body";
import styles from "./course-deep-dive.module.css";

export function CourseDeepDive({
  content,
}: {
  content: NonNullable<CourseSlide["deepDive"]>;
}) {
  const [revealed, setRevealed] = useState(false);
  const attach = useCallback((node: HTMLDetailsElement | null) => {
    // A native disclosure can open before React finishes hydrating.
    if (node?.open) setRevealed(true);
  }, []);
  return (
    <details
      ref={attach}
      className={styles.deepDive}
      data-course-depth
      data-depth-diagram={content.diagram}
      onToggle={(event) => {
        if (event.currentTarget.open) setRevealed(true);
      }}
    >
      <summary>
        <span className={styles.depthLabel}>Go deeper</span>
        <span>{content.title}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </summary>
      {revealed && (
        <div className={styles.depthBody}>
          {content.diagram && <CourseDiagram kind={content.diagram} />}
          <SlideBody blocks={content.body} />
          {content.references && (
            <nav aria-label="Deep dive sources" className={styles.sources}>
              <span>Further reading</span>
              {content.references.map((reference) => (
                <a
                  key={reference.url}
                  href={reference.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {reference.title}
                </a>
              ))}
            </nav>
          )}
        </div>
      )}
    </details>
  );
}
