import { RAG_ANSWER_DIAGRAMS } from "./course-diagram-answer-registry";
import {
  MultiQueryDiagram,
  RetrievalFunnelDiagram,
} from "./course-diagram-query";
import { HybridMergeDiagram, RrfRanksDiagram } from "./course-diagram-hybrid";
import { FilterTimingDiagram } from "./course-diagram-filters";
import { HnswLayersDiagram } from "./course-diagram-hnsw";
import { IvfClustersDiagram } from "./course-diagram-ivf";
import { VectorAngleDiagram, BiEncoderDiagram } from "./course-diagram-vectors";
import type { ComponentType } from "react";
import type { CourseDiagramKind } from "@/lib/play/course/slide-diagrams";
import { PipelineDiagram } from "./course-diagram-chunking";
import { OverlapDiagram, SmallToBigDiagram } from "./course-diagram-landscape";
import { SplitTableDiagram } from "./course-diagram-table";
import {
  RagAnswerDiagram,
  RagModelsDiagram,
  RagTwoPathsDiagram,
} from "./course-diagram-primer";
import styles from "./course-diagram.module.css";
const diagrams = {
  ...RAG_ANSWER_DIAGRAMS,
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
  "vector-angle": {
    art: VectorAngleDiagram,
    alt: "Three vectors share an origin. Refund policy and Get my money back have a small gold angle; Office chair points away.",
  },
  "bi-encoder": {
    art: BiEncoderDiagram,
    alt: "Offline document encoding fills the gold vector index. Each query is encoded separately; similarity search returns top k.",
  },
  "hnsw-layers": {
    art: HnswLayersDiagram,
    alt: "HNSW has three layers with 3, 6 and 12 nodes. A gold search path descends to the node nearest the query star.",
  },
  "ivf-clusters": {
    art: IvfClustersDiagram,
    alt: "IVF scans two of six clusters, outlined in gold. A nearby dot in an unscanned cluster is missed.",
  },
  "filter-timing": {
    art: FilterTimingDiagram,
    alt: "Filtering after the top ten leaves one result. Filtering during search returns ten allowed results, highlighted in gold.",
  },
  "hybrid-merge": {
    art: HybridMergeDiagram,
    alt: "A query searches keyword and dense indexes in parallel. Their rankings merge with RRF into the top results.",
  },
  "rrf-ranks": {
    art: RrfRanksDiagram,
    alt: "Keyword ranks A, C, B; dense ranks B, A. RRF ranks A, B, C, with A and B highlighted in gold.",
  },
  "multi-query": {
    art: MultiQueryDiagram,
    alt: "An LLM rewrites one question into three queries. Parallel searches flow into a gold RRF merge and then results.",
  },
  "retrieval-funnel": {
    art: RetrievalFunnelDiagram,
    alt: "One million chunks narrow to 100 retrieved candidates, ten reranked results and five chunks in the prompt, highlighted in gold.",
  },
} satisfies Record<CourseDiagramKind, { art: ComponentType; alt: string }>;
export function CourseDiagram({ kind }: { kind: CourseDiagramKind }) {
  const { art: Art, alt } = diagrams[kind];
  return (
    <figure
      role="img"
      aria-label={alt}
      data-course-diagram={kind}
      className={`${styles.figure} ${styles.pipeline}`}
    >
      <Art />
    </figure>
  );
}
