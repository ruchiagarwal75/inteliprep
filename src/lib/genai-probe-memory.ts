import type { ChatMessage } from "@/lib/chat";
import type { ProblemTrack } from "@/lib/interview-selection";
import type { QuestionMemory } from "@/lib/question-memory";
import type { PendingQuestion } from "@/lib/open-question-queue";
import { sameQuestion } from "@/lib/question-memory";
import { questionAtEnd } from "@/lib/open-question";
import { probeTopic } from "@/lib/probe-topics";
import { topicWasAnswered } from "@/lib/topic-memory";
type Probe = {
  id: string;
  question: string;
  topicPattern: string;
  topic?: string;
};

/** Answered issues stay closed across both tracks; two asks is an interview-wide cap. */
export function eligibleDiscussionProbes<T extends Probe>(
  _track: ProblemTrack,
  probes: T[],
  memory?: QuestionMemory,
  _requested?: string,
) {
  void _requested; // Naming a topic never overrides its interview-wide cap.
  return probes.filter(
    (p) =>
      (memory?.topicTurns?.[p.id] ?? memory?.topicTurns?.[probeTopic(p)] ?? 0) <
        2 &&
      !topicWasAnswered(memory?.coveredTopics, p.id) &&
      !memory?.coveredTopics.some((covered) =>
        sameQuestion(p.question, covered),
      ),
  );
}

/** Retirement closes the queue item, not its assessment or evidence of correctness. */
export function cappedGenaiQuestions(
  _track: ProblemTrack,
  queue: PendingQuestion[],
  messages: ChatMessage[],
  counts: Record<string, number> = {},
) {
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
