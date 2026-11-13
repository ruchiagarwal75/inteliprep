import type { ReactNode } from "react";
import styles from "./course-diagram.module.css";
/** Two intentional layouts. Text remains native SVG in both sizes. */
export function ResponsiveCourseDiagram({
  desktop,
  portrait,
  label,
  portraitHeight = 360,
}: {
  desktop: ReactNode;
  portrait: ReactNode;
  label: string;
  portraitHeight?: number;
}) {
  return (
    <>
      <svg
        className={styles.landscape}
        data-diagram-layout="landscape"
        viewBox="0 0 680 190"
        aria-hidden="true"
      >
        <title>{label}</title>
        {desktop}
      </svg>
      <svg
        className={styles.portrait}
        data-diagram-layout="portrait"
        viewBox={`0 0 320 ${portraitHeight}`}
        aria-hidden="true"
      >
        <title>{label}</title>
        {portrait}
      </svg>
    </>
  );
}
export function QueryStar({ x, y }: { x: number; y: number }) {
  return (
    <path
      className={styles.notice}
      d="M0 -10 3 -3 10 0 3 3 0 10 -3 3 -10 0 -3 -3Z"
      transform={`translate(${x} ${y})`}
    />
  );
}
