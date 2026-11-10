import type { ChatMessage } from "@/lib/chat";
import type { PendingQuestion } from "@/lib/open-question-queue";
import { questionAtEnd } from "@/lib/open-question";
import { isGenericProbe } from "@/lib/review-probes";
import { plainInterviewerText } from "@/lib/interviewer-reply-filter";

const normalized = (text: string) =>
  text.toLowerCase().replace(/\s+/gu, " ").trim();
/** A resumed question keeps its identity but must not repeat the last ask verbatim. */
export function resumePendingQuestion(
  pending: PendingQuestion,
  messages: ChatMessage[],
  proposed?: string,
  questionId?: string,
) {
  const previous =
    messages.findLast((m) => m.role === "assistant")?.content ?? "";
  const question = plainInterviewerText(proposed ?? "").trim();
  const last = questionAtEnd(previous) ?? previous;
  if (
    questionId === pending.id &&
    questionAtEnd(question) &&
    (question.match(/[?？]/gu)?.length ?? 0) === 1 &&
    normalized(questionAtEnd(question) ?? question) !== normalized(last) &&
    normalized(questionAtEnd(question) ?? question) !==
      normalized(questionAtEnd(pending.question) ?? pending.question) &&
    !isGenericProbe(question)
  )
    return question;
  // Malformed/repeated generations still give a concrete ask without a second model call.
  const topic = (pending.topicId ?? "the request path")
    .replace(/[_-]+/gu, " ")
    .replace(/\bid\b/giu, "ID");
  const choices =
    pending.topicId === "diagram_consistency"
      ? [
          "Which version should I use when discussing your design?",
          "What should the diagram show for that part of your design?",
        ]
      : [
          `Walk me through ${topic} in your design, starting with the first decision.`,
          `Explain the next step of ${topic} using a concrete example.`,
        ];
  return (
    choices.find(
      (choice) => !normalized(previous).endsWith(normalized(choice)),
    ) ?? choices[0]
  );
}
