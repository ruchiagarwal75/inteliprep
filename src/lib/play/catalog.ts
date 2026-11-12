import "server-only";
import { RAG_COURSE_ID, RAG_COURSE_NODES } from "./course/metadata";
/** Retired RAG levels. Retained only to read old attempts and reward metadata. */
export const RAG_LEVELS = [
  { level: 1, title: "Retrieval basics", points: 10 },
  { level: 2, title: "Scale math", points: 15 },
  { level: 3, title: "Permissions and freshness", points: 15 },
  { level: 4, title: "Quality and safety", points: 20 },
] as const;
/** New topics are enabled by content and metadata, without adding route code. */
export const PLAY_TOPICS = [
  {
    id: "rag",
    title: "RAG",
    description:
      "Retrieve the right evidence and build answers people can trust.",
    available: true,
    levels: RAG_LEVELS,
    placementLevels: [1, 2, 3],
    mockProblemId: "enterprise-rag-assistant",
    practiceBadgeId: "rag-practice",
    interviewBadgeId: "rag-interview",
  },
  {
    id: "chat-serving",
    title: "Chat and serving",
    description: "Keep model responses fast, useful and reliable.",
    available: false,
    levels: [],
    placementLevels: [],
    mockProblemId: null,
    practiceBadgeId: null,
    interviewBadgeId: null,
  },
  {
    id: "agents",
    title: "Agents",
    description:
      "Build tools that act safely and recover when things go wrong.",
    available: false,
    levels: [],
    placementLevels: [],
    mockProblemId: null,
    practiceBadgeId: null,
    interviewBadgeId: null,
  },
  {
    id: "final-loop",
    title: "Final Loop",
    description: "Bring your interview practice together.",
    available: false,
    levels: [],
    placementLevels: [],
    mockProblemId: null,
    practiceBadgeId: null,
    interviewBadgeId: null,
  },
] as const;
export const playTopic = (id: string) =>
  id === RAG_COURSE_ID
    ? {
        ...PLAY_TOPICS[0],
        id: RAG_COURSE_ID,
        levels: RAG_COURSE_NODES.map((node) => ({ ...node, points: 10 })),
        placementLevels: [],
      }
    : PLAY_TOPICS.find((topic) => topic.id === id);
export const levelsForTopic = (id: string) => playTopic(id)?.levels ?? [];
