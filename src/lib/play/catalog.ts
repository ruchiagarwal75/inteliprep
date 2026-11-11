import "server-only";

/** Content metadata is projected on the server. Future topics need config, not routes. */
export const PLAY_TOPICS = [
  {
    id: "rag",
    title: "RAG",
    description:
      "Retrieve the right evidence and build answers people can trust.",
    available: true,
  },
  {
    id: "chat-serving",
    title: "Chat and serving",
    description: "Keep model responses fast, useful and reliable.",
    available: false,
  },
  {
    id: "agents",
    title: "Agents",
    description:
      "Build tools that act safely and recover when things go wrong.",
    available: false,
  },
  {
    id: "final-loop",
    title: "Final Loop",
    description: "Bring your interview practice together.",
    available: false,
  },
] as const;
export const RAG_LEVELS = [
  { level: 1, title: "Retrieval basics" },
  { level: 2, title: "Scale math" },
  { level: 3, title: "Permissions and freshness" },
  { level: 4, title: "Quality and safety" },
] as const;
export const playTopic = (id: string) =>
  PLAY_TOPICS.find((topic) => topic.id === id);
