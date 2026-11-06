import type { InterviewContext } from "@/lib/interview-instructions";
import type { ChatMessage } from "@/lib/chat";
import { repliedToOpenQuestion } from "@/lib/open-question";

/** Only the server-selected missing requirement may become the next question. */
export function pendingRequirementsQuestion(
  interview?: InterviewContext,
  messages: ChatMessage[] = [],
): string | undefined {
  if (
    interview?.phase?.transition !== "initial" ||
    interview.progress?.step !== "discussion"
  )
    return undefined;
  const missing = interview.phase.completionCriteria.findIndex(
    (_, index) => !interview.coveredCriteria?.includes(index),
  );
  const question = interview.phase.clarificationQuestions?.[missing];
  return repliedToOpenQuestion(messages, question) ? undefined : question;
}

/** A bare acknowledgement needs confirmation, rather than a design follow-up. */
export function isBareAcknowledgement(content: string): boolean {
  return /^(?:(?:yes|yeah|yep|ok(?:ay)?|sure|got it|understood|thanks|thank you|great|perfect|sounds good|all right|alright)(?:[\s,.!]+|$))+$/iu.test(
    content.trim(),
  );
}
