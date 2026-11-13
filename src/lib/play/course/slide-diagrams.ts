/** Public teaching illustrations. No quiz content or solutions. */
export const COURSE_DIAGRAMS = [
  "rag-answer",
  "rag-models",
  "rag-two-paths",
  "pipeline",
  "overlap",
  "split-table",
  "small-to-big",
  "vector-angle",
  "bi-encoder",
  "hnsw-layers",
  "ivf-clusters",
  "filter-timing",
  "hybrid-merge",
  "rrf-ranks",
  "multi-query",
  "retrieval-funnel",
] as const;
export type CourseDiagramKind = (typeof COURSE_DIAGRAMS)[number];
