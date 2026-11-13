import type { CourseDiagramKind } from "@/lib/play/course/slide-diagrams";
import { PipelineDiagram } from "./course-diagram-chunking";
import { OverlapDiagram, SmallToBigDiagram } from "./course-diagram-landscape";
import { SplitTableDiagram } from "./course-diagram-table";
import {
  TwoTowerDiagram,
  AnnDiagram,
  RrfDiagram,
} from "./course-diagram-retrieval";
import {
  RagAnswerDiagram,
  RagModelsDiagram,
  RagTwoPathsDiagram,
} from "./course-diagram-primer";
import styles from "./course-diagram.module.css";
const diagrams = {
  "rag-answer": {
    art: RagAnswerDiagram,
    alt: "Question flows through search of your docs, top pieces, the LLM and an answer with sources. Retrieved pieces are highlighted in gold.",
  },
  "rag-models": {
    art: RagModelsDiagram,
    alt: "Two models have different jobs. The embedding model maps text to a vector of numbers, highlighted in gold. The LLM maps text to a text answer.",
  },
  "rag-two-paths": {
    art: RagTwoPathsDiagram,
    alt: "Offline, documents are chunked, embedded and stored in the vector database. Online, a question is embedded, searches that database, then goes through a prompt and LLM to an answer.",
  },
  pipeline: {
    art: PipelineDiagram,
    alt: "Document pipeline: connect, parse, clean, chunk, enrich, embed and index. Chunking is highlighted in gold.",
  },
  overlap: {
    art: OverlapDiagram,
    alt: "A document is cut into three chunks. Their overlapping boundary text appears in both adjacent chunks and is highlighted in gold.",
  },
  "split-table": {
    art: SplitTableDiagram,
    alt: "A broken table split leaves the bottom half without Plan and Price headers, marked by a red X. The fixed split repeats the headers, highlighted in gold.",
  },
  "small-to-big": {
    art: SmallToBigDiagram,
    alt: "A small chunk inside a parent section is highlighted in gold. Search matches that chunk; the LLM receives the larger parent section for context.",
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
        styles.figure +
        ([
          "overlap",
          "small-to-big",
          "pipeline",
          "split-table",
          "rag-answer",
          "rag-models",
          "rag-two-paths",
        ].includes(kind)
          ? " " + styles.pipeline
          : "")
      }
    >
      <Art />
    </figure>
  );
}
