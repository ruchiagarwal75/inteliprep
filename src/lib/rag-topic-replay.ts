/** Navigation uses the existing 3/Solid scale. It never decides mock passing. */
export const RAG_AREA_TOPICS: Readonly<Record<string, readonly number[]>> = {
  "Requirements and estimation": [0],
  "Ingestion and retrieval": [1, 2, 3, 4],
  "Grounded answers and citations": [5, 6],
  "Evaluation and quality": [7],
  "Freshness and reliability": [8],
  "Cost, operations and evolution": [8],
  "Safety and security": [9],
};
export function ragReplayTopics(
  problemId: string,
  area: string,
  score: number | null,
): readonly number[] {
  return problemId === "enterprise-rag-assistant" && score !== null && score < 3
    ? (RAG_AREA_TOPICS[area] ?? [])
    : [];
}
