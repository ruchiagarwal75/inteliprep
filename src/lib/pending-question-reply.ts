import type { ChatMessage } from "@/lib/chat";
import type { PendingQuestion } from "@/lib/open-question-queue";
import { questionAtEnd } from "@/lib/open-question";
import { isGenericProbe } from "@/lib/review-probes";
import { plainInterviewerText } from "@/lib/interviewer-reply-filter";
import { hasInternalIdentifiers } from "@/lib/public-interviewer-reply";

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
    !hasInternalIdentifiers(question) &&
    questionAtEnd(question) &&
    (question.match(/[?？]/gu)?.length ?? 0) === 1 &&
    normalized(questionAtEnd(question) ?? question) !== normalized(last) &&
    normalized(questionAtEnd(question) ?? question) !==
      normalized(questionAtEnd(pending.question) ?? pending.question) &&
    !isGenericProbe(question)
  )
    return question;
  // Ground the continuation in the actual unanswered question, never its topic ID.
  const original = questionAtEnd(pending.question);
  if (!original || hasInternalIdentifiers(original) || isGenericProbe(original))
    return "";
  const next = `For the design you've described, ${original.charAt(0).toLowerCase()}${original.slice(1)}`;
  return messages.some(
    (m) =>
      m.role === "assistant" &&
      normalized(m.content).includes(normalized(next)),
  )
    ? ""
    : next;
}
