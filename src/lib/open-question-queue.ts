import { createHash } from "node:crypto";
import { z } from "zod";
import type { ChatMessage } from "@/lib/chat";
import { sameQuestion } from "@/lib/question-memory";
import { probeTopic } from "@/lib/probe-topics";
import { questionAtEnd } from "@/lib/open-question";

export const pendingQuestionSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{16}$/),
  question: z.string().min(1).max(1200),
  afterMessageIndex: z.number().int().min(-1).max(100),
  topicId: z.string().max(85).optional(),
});
export type PendingQuestion = z.infer<typeof pendingQuestionSchema>;
export type QuestionAnswer = { questionId: string; quoteId: string };
type Quote = { quoteId: string; messageIndex: number; quote: string };

export function enqueueQuestion(
  queue: readonly PendingQuestion[],
  reply: string,
  afterMessageIndex: number,
  topicId?: string,
): PendingQuestion[] {
  const ending = questionAtEnd(reply);
  const question =
    ending && topicId === "mmq7-diagram_consistency"
      ? reply.trim().slice(-1200)
      : ending;
  if (
    !question ||
    queue.some(
      (q) =>
        sameQuestion(q.question, question) ||
        question.endsWith(q.question) ||
        q.question.endsWith(question),
    ) ||
    queue.length >= 8
  )
    return [...queue];
  return [
    ...queue,
    {
      id: createHash("sha256")
        .update(question.toLowerCase().replace(/\s+/gu, " "))
        .digest("hex")
        .slice(0, 16),
      question,
      afterMessageIndex,
      topicId:
        topicId ?? probeTopic({ id: "other", question, topicPattern: "" }),
    },
  ];
}

/** Old records remain readable; their single pending question becomes the first queue entry. */
export function pendingQuestions(
  saved: { openQuestions?: PendingQuestion[]; openQuestion?: string },
  messages: ChatMessage[],
): PendingQuestion[] {
  if (saved.openQuestions) return [...saved.openQuestions];
  if (!saved.openQuestion) return [];
  const index = messages.findLastIndex(
    (m) =>
      m.role === "assistant" && m.content.includes(saved.openQuestion ?? ""),
  );
  return enqueueQuestion([], saved.openQuestion, index);
}

/** A structured answer must cite actual candidate evidence after the question was asked. */
export function verifiedQuestionAnswers(
  queue: readonly PendingQuestion[],
  answers: QuestionAnswer[],
  quotes: Quote[],
  allowEarlierEvidence = false,
) {
  return [
    ...new Set(
      answers.flatMap((answer) => {
        const question = queue.find((q) => q.id === answer.questionId);
        const quote = quotes.find((q) => q.quoteId === answer.quoteId);
        return question &&
          quote &&
          (allowEarlierEvidence ||
            quote.messageIndex > question.afterMessageIndex)
          ? [question.id]
          : [];
      }),
    ),
  ];
}

export function unresolvedQuestions(
  queue: readonly PendingQuestion[],
  answeredIds: readonly string[],
) {
  return queue.filter((q) => !answeredIds.includes(q.id));
}
