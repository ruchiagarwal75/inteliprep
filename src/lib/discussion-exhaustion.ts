import type { ChatMessage } from "@/lib/chat";
import type { InterviewContext } from "@/lib/interview-instructions";
import { freshDiscussionQuestion } from "@/lib/fresh-discussion-question";

/** Only the server may leave an exhausted discussion stage early; this awards no coverage. */
export async function continueDiscussion(
  messages: ChatMessage[],
  interview: InterviewContext,
  signal?: AbortSignal,
) {
  const question = await freshDiscussionQuestion(messages, interview, signal);
  if (question) return question;
  const index = interview.problem.phases.findIndex(
    (p) => p.id === interview.phase?.id,
  );
  if (
    index >= 2 &&
    index < interview.problem.phases.length - 1 &&
    interview.advancedPhaseIndex === undefined
  ) {
    interview.advancedPhaseIndex = index + 1;
    interview.phase = interview.problem.phases[index + 1];
    interview.coveredCriteria = [];
    interview.openQuestions = [];
    const next = await freshDiscussionQuestion(messages, interview, signal);
    if (next) return next;
  }
  throw new Error(
    "The interviewer couldn't produce a new question. Please retry.",
  );
}
