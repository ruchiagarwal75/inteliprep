import type { ChatMessage } from "@/lib/chat";
import type { ProblemDefinition } from "@/lib/problems";
import { probeTopic } from "@/lib/probe-topics";
import type { GenaiFixture } from "./genai-fixture";
export type BoardKey = "empty" | "partial" | "full" | "updated";
export type FullScriptRow = {
  minute: number;
  board: BoardKey;
  content?: string;
  area?: number;
  action?: ChatMessage["action"];
  image?: boolean;
};
const questions: Record<string, string[]> = {
  "enterprise-rag-assistant": [
    "How many employees, documents and sources are there?",
    "How many questions per day and what is the peak factor?",
    "How often do documents change and how quickly must edits show up?",
    "How quickly must revoked access apply, and how much content is restricted?",
    "What latency and cost targets apply?",
    "Which languages are needed, and what search do employees use today?",
    "How many chunks per document, embedding dimensions, and input/output tokens per question should I assume?",
  ],
  "ai-chat-assistant": [
    "How many daily active users, messages per user and what peak factor?",
    "Do we run our own models, and are there external provider limits?",
    "How many GPUs are available, and how fast can a new node load a model?",
    "What output throughput per GPU and token counts per message should I use?",
    "What first-token latency is required, and which tiers are there?",
    "How long is history kept, and what moderation is required?",
    "What size should I assume for one stored chat exchange?",
  ],
  "tool-using-ai-agent": [
    "How many employees and tasks per day, and how spiky is demand?",
    "Which tools are available and which can write?",
    "How many model-call steps are typical and maximum?",
    "What latency and token budget apply per task?",
    "Whose permissions are used, and how serious is sending to the wrong person?",
    "Can external actions be undone?",
    "What availability target is specified for tool integrations?",
  ],
};
export function fullInterviewScript(fixture: GenaiFixture): FullScriptRow[] {
  const facts = questions[fixture.problemId];
  if (!facts) throw new Error("Missing full script");
  return [
    ...facts.map((content, i) => ({
      minute: 0.5 + i,
      board: "empty" as const,
      content,
    })),
    { minute: 7.5, board: "empty", content: fixture.strong[0], area: 0 },
    { minute: 8, board: "partial", action: "draw", content: "Start drawing" },
    {
      minute: 9,
      board: "full",
      action: "explain",
      content: "Ready to explain",
    },
    { minute: 10, board: "full", content: fixture.strong[1], area: 1 },
    { minute: 11, board: "full", content: fixture.strong[2], area: 2 },
    {
      minute: 12,
      board: "full",
      action: "review",
      content: "Done explaining",
      image: true,
    },
    ...[13, 14.5, 16, 17.5, 19, 20.5, 22, 23.5, 25, 26.5, 28, 29.5].map(
      (minute) => ({ minute, board: "full" as const }),
    ),
    { minute: 30, board: "full", action: "draw", content: "Pause to draw" },
    {
      minute: 31,
      board: "updated",
      action: "explain",
      content: "Ready to explain",
    },
    {
      minute: 32,
      board: "updated",
      content:
        "I added an Evaluation rollout gate to make the release decision explicit. " +
        fixture.strong[5],
      area: 5,
    },
    {
      minute: 33,
      board: "updated",
      action: "review",
      content: "Done explaining",
      image: true,
    },
    ...[34, 35.5, 37, 38.5, 40, 41.5, 43, 44.5].map((minute) => ({
      minute,
      board: "updated" as const,
    })),
  ];
}
/** A fixed strong answer bank responds to the actual selected topic, without a billed candidate model. */
export function scriptedAnswer(
  problem: ProblemDefinition,
  fixture: GenaiFixture,
  topic: string | undefined,
  turn: number,
  covered: Set<number>,
  finishCoverage: boolean,
) {
  const area =
    problem.reviewProbes.find((probe) => probeTopic(probe) === topic)
      ?.areaIndex ?? [3, 6, 1, 2, 5, 4][turn % 6];
  const content = fixture.strong[area];
  const extra = finishCoverage
    ? fixture.strong.filter((_, i) => i !== area && !covered.has(i))
    : [];
  covered.add(area);
  if (finishCoverage) fixture.strong.forEach((_, i) => covered.add(i));
  return [content, ...extra].join("\n\n").replaceAll("\u2014", ", ");
}
