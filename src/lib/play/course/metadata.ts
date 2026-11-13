/** Public course identity and path labels. No questions or answers live here. */
export const RAG_COURSE_ID = "rag-course";
export const RAG_COURSE_NODES = [
  { level: 0, title: "RAG basics", available: true, minutes: 8 },
  { level: 1, title: "Ingestion and chunking", available: true },
  { level: 2, title: "Embeddings and the vector store", available: true },
  { level: 3, title: "Retrieval strategy", available: true },
  { level: 4, title: "Re-ranking", available: false },
  { level: 5, title: "Context assembly and prompt building", available: false },
  { level: 6, title: "Generation", available: false },
  { level: 7, title: "Evaluation", available: false },
  { level: 8, title: "Freshness, scale and serving", available: false },
  { level: 9, title: "Failure modes and safety", available: false },
] as const;
export const courseTopicHref = (level: number) => `/play/rag/topics/${level}`;
export const playWorldHref = (id: string) =>
  `/play/${id === RAG_COURSE_ID ? "rag" : id}`;

export const playProgressTopic = (id: string) =>
  id === "rag" ? RAG_COURSE_ID : id;
