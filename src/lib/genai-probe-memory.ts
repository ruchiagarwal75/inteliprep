import type { ChatMessage } from "@/lib/chat";
import type { ProblemTrack } from "@/lib/interview-selection";
import type { QuestionMemory } from "@/lib/question-memory";
import type { PendingQuestion } from "@/lib/open-question-queue";
import { sameQuestion } from "@/lib/question-memory";
import { questionAtEnd } from "@/lib/open-question";
import { availableTopicProbes, probeTopic } from "@/lib/probe-topics";
type Probe = {
  id: string;
  question: string;
  topicPattern: string;
  topic?: string;
};

/** Covered GenAI issues stay closed, and two attempts cannot be revived by fallback. */
export function eligibleDiscussionProbes<T extends Probe>(
  track: ProblemTrack,
  probes: T[],
  memory?: QuestionMemory,
  requested?: string,
) {
  if (track !== "genai")
    return availableTopicProbes(probes, memory?.topicTurns, requested);
  return probes.filter(
    (p) =>
      (memory?.topicTurns?.[probeTopic(p)] ?? 0) < 2 &&
      !memory?.coveredTopics.some((covered) =>
        sameQuestion(p.question, covered),
      ),
  );
}

/** Retirement closes the queue item, not its assessment or evidence of correctness. */
export function cappedGenaiQuestions(
  track: ProblemTrack,
  queue: PendingQuestion[],
  messages: ChatMessage[],
  counts: Record<string, number> = {},
) {
  if (track !== "genai") return { questions: queue, retired: [] as string[] };
  const retired = queue
    .filter(
      (q) =>
        (counts[q.topicId ?? ""] ?? 0) >= 2 ||
        messages.filter(
          (m) =>
            m.role === "assistant" &&
            sameQuestion(questionAtEnd(m.content) ?? m.content, q.question),
        ).length >= 2,
    )
    .map((q) => q.id);
  return { questions: queue.filter((q) => !retired.includes(q.id)), retired };
}
