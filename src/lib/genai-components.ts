/** Semantic roles only. No vendor or model is prescribed as the right answer. */
export const genaiComponents = [
  {
    id: "vector_store",
    name: "vector store",
    pattern:
      /\b(?:vector\s*(?:db|database|store|index)|embeddings?\s*store|ann\s*index|pgvector|pinecone)\b/iu,
  },
  {
    id: "embedder",
    name: "embedding service",
    pattern: /\b(?:embedding service|embedder|two[- ]tower|embeddings?)\b/iu,
  },
  {
    id: "inference",
    name: "model/inference service",
    pattern:
      /\b(?:llm|inference(?: server)?|model server|gpu cluster|language model|large model|small model)\b|(?<!embedding )(?<!data )(?<!cost )(?<!threat )\bmodel\b/iu,
  },
  {
    id: "reranker",
    name: "reranker",
    pattern:
      /\b(?:reranker|re[- ]?rank(?:ing)?(?: service)?|cross[- ]encoder)\b/iu,
  },
  {
    id: "guardrails",
    name: "guardrails",
    pattern: /\b(?:guardrails?|moderation|safety filter)\b/iu,
  },
  {
    id: "tools",
    name: "tool service",
    pattern: /\btool (?:registry|executor)\b/iu,
  },
  {
    id: "agent",
    name: "agent runner",
    pattern: /\b(?:orchestrator|agent runner|planner)\b/iu,
  },
  {
    id: "evaluation",
    name: "evaluation service",
    pattern: /\b(?:eval|evaluation|judge)\b/iu,
  },
  {
    id: "context",
    name: "context builder",
    pattern: /\b(?:prompt builder|context builder)\b/iu,
  },
  {
    id: "candidates",
    name: "candidate generation",
    pattern: /\b(?:candidate generation|candidate sources?)\b/iu,
  },
  {
    id: "ranking",
    name: "ranking service",
    pattern: /\b(?:ranking|ranker|ranking model)\b/iu,
  },
  { id: "features", name: "feature store", pattern: /\b(?:feature store)\b/iu },
  {
    id: "training",
    name: "training pipeline",
    pattern: /\b(?:training pipeline|trainer)\b/iu,
  },
  {
    id: "labels",
    name: "label store",
    pattern: /\b(?:label store|label pipeline)\b/iu,
  },
  {
    id: "experiments",
    name: "experiment platform",
    pattern: /\b(?:experiment(?:ation)? platform|a\/b test)\b/iu,
  },
  { id: "auction", name: "auction", pattern: /\b(?:auction)\b/iu },
  {
    id: "calibration",
    name: "calibration",
    pattern: /\b(?:calibration|calibrator)\b/iu,
  },
  {
    id: "ctr",
    name: "CTR model",
    pattern: /\b(?:ctr model|click prediction)\b/iu,
  },
];
export const GENAI_SAFETY_SCENARIO =
  /\b(?:document|email|tool (?:output|result)|retrieved (?:content|text)|prompt injection)\b[\s\S]*\b(?:what happens|what if|how (?:do|would|should)|untrusted|ignore|instructions|attack|block|defen\w*)\b/iu;
