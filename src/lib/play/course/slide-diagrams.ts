/** Public teaching illustrations. No quiz content or solutions. */
export const COURSE_DIAGRAMS = [
  "rag-answer",
  "rag-models",
  "rag-two-paths",
  "pipeline",
  "overlap",
  "split-table",
  "small-to-big",
  "two-tower",
  "ann",
  "rrf",
] as const;
export type CourseDiagramKind = (typeof COURSE_DIAGRAMS)[number];
