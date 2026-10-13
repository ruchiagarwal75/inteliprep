import type { ChatMessage } from "@/lib/chat";
import {
  buildInterviewerInput,
  INTERVIEWER_INSTRUCTIONS,
} from "@/lib/interviewer-input";
import {
  buildInterviewInstructions,
  type InterviewContext,
} from "@/lib/interview-instructions";
import {
  withoutQuestions,
  DRAWING_WAIT_REPLY,
  EXPLANATION_WAIT_REPLY,
} from "@/lib/drawing-reply";

import { createOpenAIClient, interviewerModel } from "@/lib/openai-client";
import {
  isBareAcknowledgement,
  pendingRequirementsQuestion,
} from "@/lib/requirements-reply";
import {
  configuredClarification,
  isFactualQuestion,
  sharedRequirementCriteria,
} from "@/lib/configured-clarifications";
export { MissingApiKeyError, hasApiKey } from "@/lib/openai-client";

/** Streams the interviewer's reply as plain text deltas. */
export async function* streamInterviewerReply(
  messages: ChatMessage[],
  diagramText: string,
  changeText: string,
  signal?: AbortSignal,
  diagramImage?: string,
  interview?: InterviewContext,
): AsyncGenerator<string> {
  const latestCandidate = messages.findLast(
    (message) => message.role === "user",
  );
  const step = interview?.progress?.step;
  const clarification =
    interview &&
    latestCandidate &&
    configuredClarification(
      interview.problem,
      interview.level,
      latestCandidate.content,
    );
  const requirementsQuestion = pendingRequirementsQuestion(
    interview && clarification
      ? {
          ...interview,
          coveredCriteria: [
            ...(interview.coveredCriteria ?? []),
            ...clarification.coveredCriteria,
          ],
        }
      : interview,
  );
  if (clarification) {
    signal?.throwIfAborted();
    yield clarification.text;
    if (step === "invite-drawing")
      yield `\n\n${interview.problem.drawingPolicy.invitation}`;
    else if (requirementsQuestion) yield `\n\n${requirementsQuestion}`;
    return;
  }
  if (
    (step === "explaining" || step === "drawing") &&
    latestCandidate &&
    !isFactualQuestion(latestCandidate.content)
  ) {
    signal?.throwIfAborted();
    yield interview?.listening
      ? "I'm listening."
      : step === "explaining"
        ? EXPLANATION_WAIT_REPLY
        : DRAWING_WAIT_REPLY;
    return;
  }
  if (interview?.reviewQuestion) {
    signal?.throwIfAborted();
    yield interview.reviewQuestion;
    return;
  }
  if (
    requirementsQuestion &&
    latestCandidate &&
    isBareAcknowledgement(latestCandidate.content)
  ) {
    signal?.throwIfAborted();
    yield requirementsQuestion;
    return;
  }
  const stream = await createOpenAIClient().responses.create(
    {
      model: interviewerModel(),
      instructions: interview
        ? buildInterviewInstructions(interview)
        : INTERVIEWER_INSTRUCTIONS,
      input: buildInterviewerInput(
        messages,
        diagramText,
        changeText,
        diagramImage,
      ),
      stream: true,
    },
    { signal },
  );

  const closing =
    interview?.phase?.transition === "wrap-up" && step === "review";
  const drawingReply =
    closing ||
    step === "invite-drawing" ||
    step === "drawing" ||
    step === "explaining";
  let bufferedReply = "";
  let completed = false;
  for await (const event of stream) {
    if (
      event.type === "response.failed" ||
      event.type === "response.incomplete"
    ) {
      throw new Error(
        "The interviewer reply did not complete. Please try again.",
      );
    }
    if (event.type === "response.completed") completed = true;
    if (event.type === "response.output_text.delta") {
      if (drawingReply || requirementsQuestion) bufferedReply += event.delta;
      else yield event.delta;
    }
  }
  if (!completed)
    throw new Error(
      "The interviewer reply did not complete. Please try again.",
    );
  if (drawingReply || requirementsQuestion) {
    const reply = withoutQuestions(bufferedReply);
    const afterReply =
      interview?.phase?.transition === "initial"
        ? {
            ...interview,
            coveredCriteria: [
              ...new Set([
                ...(interview.coveredCriteria ?? []),
                ...sharedRequirementCriteria(
                  interview.problem,
                  interview.level,
                  [...messages, { role: "assistant" as const, content: reply }],
                ),
              ]),
            ],
          }
        : interview;
    const nextQuestion = pendingRequirementsQuestion(afterReply);
    const justCompletedRequirements =
      requirementsQuestion &&
      afterReply?.phase &&
      afterReply.coveredCriteria?.length ===
        afterReply.phase.completionCriteria.length;
    if (reply) yield reply;
    if (nextQuestion) yield `${reply ? "\n\n" : ""}${nextQuestion}`;
    else if (
      (step === "invite-drawing" || justCompletedRequirements) &&
      interview
    )
      yield `${reply ? "\n\n" : ""}${interview.problem.drawingPolicy.invitation}`;
    else if (!reply && closing)
      yield "Thanks for walking through your design and its tradeoffs.";
    else if (!reply)
      yield step === "explaining" ? EXPLANATION_WAIT_REPLY : DRAWING_WAIT_REPLY;
  }
}
