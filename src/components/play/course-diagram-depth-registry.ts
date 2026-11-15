import {
  ChunkBoundaryCaseDiagram,
  PermissionRevokeRaceDiagram,
} from "./course-diagram-depth";
import {
  ContextBudgetCaseDiagram,
  VectorMemoryBudgetDiagram,
} from "./course-diagram-depth-math";
import {
  EvaluationCaseDiagram,
  RetrievalDebugCaseDiagram,
} from "./course-diagram-depth-debug";

export const RAG_DEPTH_DIAGRAMS = {
  "chunk-boundary-case": {
    art: ChunkBoundaryCaseDiagram,
    alt: "The contractor heading and the no-chair-allowance rule stay in one gold chunk, allowing an answer that preserves the exclusion.",
  },
  "vector-memory-budget": {
    art: VectorMemoryBudgetDiagram,
    alt: "Two million documents with ten chunks each give twenty million vectors. At 768 float32 dimensions, raw vectors use 61.44 GB, or 122.88 GB with two copies, before overhead.",
  },
  "permission-revoke-race": {
    art: PermissionRevokeRaceDiagram,
    alt: "Access is revoked at 10:00. A stale candidate returned at 10:01 meets a current permission check and is denied before protected text reaches the LLM.",
  },
  "retrieval-debug-case": {
    art: RetrievalDebugCaseDiagram,
    alt: "Policy version 12 is indexed, but its chunk ranks 37th and is dropped by the top-twenty candidate cutoff. The final prompt lacks the required evidence.",
  },
  "context-budget-case": {
    art: ContextBudgetCaseDiagram,
    alt: "A 16,000-token example window reserves 1,000 for instructions, 3,000 for history, 1,000 for the question and formatting, and 2,000 for output, leaving 9,000 for evidence.",
  },
  "eval-case": {
    art: EvaluationCaseDiagram,
    alt: "Of ten answerable questions, eight have indexed evidence, six retrieve it and five receive supported answers. End-to-end success is fifty percent; conditional generation success is five of six.",
  },
};
