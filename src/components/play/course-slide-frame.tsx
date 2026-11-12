import type { CourseSlide } from "@/lib/play/course/slides-public";
import { CourseDiagram } from "./course-diagram";
import { SlideBody } from "./slide-body";
import styles from "./course-slide-frame.module.css";

export function CourseSlideFrame({
  slide,
  index,
  count,
  scrollable = false,
}: {
  slide: CourseSlide;
  index: number;
  count: number;
  scrollable?: boolean;
}) {
  return (
    <article
      className={`practice-surface ${styles.frame}${scrollable ? ` ${styles.scrolling}` : ""}`}
      aria-live="polite"
      role={scrollable ? "region" : undefined}
      aria-label={scrollable ? "Slides reader" : undefined}
      tabIndex={scrollable ? 0 : undefined}
    >
      <p className={styles.counter} aria-label="Slide counter">
        {index + 1} / {count}
      </p>
      <h2 data-game-label>{slide.title}</h2>
      <div
        key={index}
        className={styles.body}
        role="region"
        aria-label="Slide content"
      >
        {slide.diagram && <CourseDiagram kind={slide.diagram} />}
        <SlideBody blocks={slide.body} />
      </div>
    </article>
  );
}
