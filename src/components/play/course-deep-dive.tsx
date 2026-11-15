import type { CourseSlide } from "@/lib/play/course/slides-public";
import { CourseDiagram } from "./course-diagram";
import { SlideBody } from "./slide-body";
import styles from "./course-deep-dive.module.css";

export function CourseDeepDive({
  content,
}: {
  content: NonNullable<CourseSlide["deepDive"]>;
}) {
  return (
    <details className={styles.deepDive} data-course-depth>
      <summary>
        <span className={styles.depthLabel}>Go deeper</span>
        <span>{content.title}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </summary>
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
    </details>
  );
}
