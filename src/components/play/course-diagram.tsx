import type { CourseDiagramKind } from "@/lib/play/course/slide-diagrams";
import {
  PipelineDiagram,
  OverlapDiagram,
  SplitTableDiagram,
} from "./course-diagram-chunking";
import {
  TwoTowerDiagram,
  AnnDiagram,
  RrfDiagram,
} from "./course-diagram-retrieval";
import styles from "./course-diagram.module.css";
const diagrams = {
  pipeline: {
    art: PipelineDiagram,
    alt: "Document pipeline: source, parse, chunk, metadata, embed, index. Chunking is highlighted.",
  },
  overlap: {
    art: OverlapDiagram,
    alt: "Two chunks share the same boundary text. The shared overlap is highlighted in gold.",
  },
  "split-table": {
    art: SplitTableDiagram,
    alt: "A table is split into two chunks. Only the first keeps the Plan and Price headers. The missing header on the second is highlighted.",
  },
  "two-tower": {
    art: TwoTowerDiagram,
    alt: "Separate query and document encoders feed a dot product. The comparison is highlighted.",
  },
  ann: {
    art: AnnDiagram,
    alt: "HNSW connects nearby vectors in a graph. IVF groups them into clusters and searches a nearby cluster, highlighted in gold.",
  },
  rrf: {
    art: RrfDiagram,
    alt: "Keyword and vector rankings merge into one RRF ranking. The combined list is highlighted.",
  },
};
export function CourseDiagram({ kind }: { kind: CourseDiagramKind }) {
  const { art: Art, alt } = diagrams[kind];
  return (
    <figure
      role="img"
      aria-label={alt}
      data-course-diagram={kind}
      className={
        styles.figure + (kind === "pipeline" ? " " + styles.pipeline : "")
      }
    >
      <Art />
    </figure>
  );
}
