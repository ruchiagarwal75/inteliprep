import { hasAsk, invitesDrawing } from "@/lib/open-question";
import { selectReviewProbe } from "@/lib/review-probes";
import { trimAcknowledgements } from "@/lib/question-memory";
import type { ChatMessage } from "@/lib/chat";
import { isRequirementProposal } from "@/lib/candidate-proposal";
import {
  interviewerReplyFilter,
  plainInterviewerText,
  removeCandidateEcho,
} from "@/lib/interviewer-reply-filter";
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
import { reviewQuestion } from "@/lib/review-question";
import { requestedReviewTopic } from "@/lib/review-probes";
import { boundedModelMessages } from "@/lib/model-budget";
import { boundedModelRequest } from "@/lib/model-request";
import { isOffTopicRequest, DESIGN_REDIRECT } from "@/lib/off-topic";
import { injectDevelopmentModelFailure } from "@/lib/development-model-fault";
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
async function* rawInterviewerReply(
  messages: ChatMessage[],
  diagramText: string,
  changeText: string,
  signal?: AbortSignal,
  diagramImage?: string,
  interview?: InterviewContext,
): AsyncGenerator<string> {
  if (interview?.explanationMissing) {
    yield "Please walk through your design before opening discussion.";
    return;
  }
  const modelMessages = boundedModelMessages(messages);
  const latestCandidate = messages.findLast(
    (message) => message.role === "user",
  );
  if (
    latestCandidate?.source !== "control" &&
    isOffTopicRequest(latestCandidate?.content ?? "")
  ) {
    signal?.throwIfAborted();
    yield DESIGN_REDIRECT;
    return;
  }
  const step = interview?.progress?.step;
  const requestedTopic = requestedReviewTopic(messages);
  const focusedReview =
    step === "review" &&
    interview?.phase?.transition !== "wrap-up" &&
    !isRequirementProposal(latestCandidate?.content ?? "") &&
    (Boolean(requestedTopic) ||
      !isFactualQuestion(latestCandidate?.content ?? ""));
  const requirementProposal = Boolean(
    latestCandidate && isRequirementProposal(latestCandidate.content),
  );
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
    messages,
  );
  if (focusedReview && interview && requestedTopic) {
    signal?.throwIfAborted();
    yield await reviewQuestion("", messages, interview, signal);
    return;
  }
  if (clarification?.complete && interview) {
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
    !requirementProposal &&
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
    yield step === "drawing" || step === "explaining"
      ? withoutQuestions(interview.reviewQuestion)
      : interview.reviewQuestion;
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
  injectDevelopmentModelFailure();
  const stream = await createOpenAIClient().responses.create(
    boundedModelRequest({
      model: interviewerModel(),
      max_output_tokens: 800,
      instructions: interview
        ? buildInterviewInstructions({
            ...interview,
            requirementProposal,
            focusedReview,
          })
        : INTERVIEWER_INSTRUCTIONS,
      input: buildInterviewerInput(
        modelMessages,
        diagramText,
        changeText,
        diagramImage,
      ),
      stream: true,
    }),
    { signal },
  );

  const closing = false;
  const drawingReply =
    closing ||
    step === "invite-drawing" ||
    step === "drawing" ||
    step === "explaining";
  const clarifying = interview?.phase?.transition === "initial";
  let bufferedReply = "";
  const filtered = interviewerReplyFilter(messages);
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
      if (drawingReply || clarifying || requirementsQuestion || focusedReview)
        bufferedReply += event.delta;
      else {
        const text = filtered.push(event.delta);
        if (text) yield text;
      }
    }
  }
  if (!completed)
    throw new Error(
      "The interviewer reply did not complete. Please try again.",
    );
  if (focusedReview && interview) {
    yield await reviewQuestion(bufferedReply, messages, interview, signal);
    return;
  }
  if (!drawingReply && !clarifying && !requirementsQuestion) {
    const text = filtered.finish();
    if (text) yield text;
  }
  if (drawingReply || clarifying || requirementsQuestion) {
    let reply = withoutQuestions(
      removeCandidateEcho(plainInterviewerText(bufferedReply), messages),
    );
    if (clarifying && interview && invitesDrawing(reply)) {
      yield interview.problem.drawingPolicy.invitation;
      return;
    }
    if (step === "invite-drawing" || (clarifying && invitesDrawing(reply)))
      reply = reply
        .split(/(?<=[.!])\s+/u)
        .filter(
          (sentence) =>
            !/\b(?:draw|drawing|sketch|whiteboard|Done explaining|Explain my design)\b/iu.test(
              sentence,
            ),
        )
        .join(" ");
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
    const nextQuestion = pendingRequirementsQuestion(afterReply, messages);
    const justCompletedRequirements =
      requirementsQuestion &&
      afterReply?.phase &&
      afterReply.coveredCriteria?.length ===
        afterReply.phase.completionCriteria.length;
    if (reply) yield reply;
    if (nextQuestion) yield `${reply ? "\n\n" : ""}${nextQuestion}`;
    else if (
      (step === "invite-drawing" ||
        (justCompletedRequirements && interview?.mayInviteDrawing !== false)) &&
      interview
    )
      yield `${reply ? "\n\n" : ""}${interview.problem.drawingPolicy.invitation}`;
    else if (!reply && closing)
      yield "Thanks for walking through your design and its tradeoffs.";
    else if (!reply && clarifying && step === "discussion")
      yield interview?.mayInviteDrawing !== false
        ? (interview?.problem.drawingPolicy.invitation ??
          "Please choose Skip to drawing when ready.")
        : "Please review your requirements and choose Skip to drawing when you are ready.";
    else if (!reply)
      yield step === "explaining" ? EXPLANATION_WAIT_REPLY : DRAWING_WAIT_REPLY;
  }
}

/** Enforce an actionable ending without regenerating or repeating an entire reply. */
export async function* streamInterviewerReply(
  ...args: Parameters<typeof rawInterviewerReply>
): AsyncGenerator<string> {
  let reply = "";
  for await (const part of rawInterviewerReply(...args)) reply += part;
  const interview = args[5];
  reply = trimAcknowledgements(reply);
  if (interview && invitesDrawing(reply)) {
    // Canonical wording also makes the client and next server turn recognize the handoff.
    if (!reply.includes(interview.problem.drawingPolicy.invitation))
      reply = interview.problem.drawingPolicy.invitation;
    yield reply;
    return;
  }
  yield reply;
  if (
    interview?.phase &&
    !["drawing", "explaining"].includes(interview.progress?.step ?? "") &&
    !hasAsk(reply)
  ) {
    const probe = selectReviewProbe(interview.problem, args[0], interview);
    if (interview.phase?.transition === "initial") {
      const pending = pendingRequirementsQuestion(interview);
      const unasked =
        pending &&
        !args[0].some(
          (m) => m.role === "assistant" && m.content.includes(pending),
        );
      yield "\n\n" +
        (unasked
          ? pending
          : "Please review your requirements and choose Skip to drawing when you are ready.");
      return;
    }
    yield "\n\n" +
      (probe?.question ??
        "Please explain one tradeoff in your design and how you would test it.");
  }
}
