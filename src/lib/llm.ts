import { cappedGenaiQuestions } from "@/lib/genai-probe-memory";
import { genaiFactFollowUp } from "@/lib/genai-clarification-pace";
import {
  genaiClarification,
  GENAI_REPHRASE_REPLY,
} from "@/lib/genai-fact-router";
import { genaiAssumptionReply } from "@/lib/genai-facts";
import { genaiEstimateVerdict } from "@/lib/genai-estimation";
import { quoteDiagramLabels } from "@/lib/diagram-label-copy";
import { hasPriorExplanation } from "@/lib/open-question";
import {
  clarificationEnding,
  clarificationContinuation,
  estimationAsk,
} from "@/lib/clarification-continuation";
import { resumePendingQuestion } from "@/lib/pending-question-reply";
import { observedModelRequest } from "@/lib/observed-model-request";
import { hasAsk, invitesDrawing } from "@/lib/open-question";
import { selectReviewProbe } from "@/lib/review-probes";
import {
  trimAcknowledgements,
  repeatsLastQuestion,
} from "@/lib/question-memory";
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
  EXPLANATION_UPDATE_REPLY,
} from "@/lib/drawing-reply";

import { modelSettings } from "@/lib/model-settings";
import { reviewQuestion } from "@/lib/review-question";
import { requestedReviewTopic } from "@/lib/review-probes";
import { boundedModelMessages } from "@/lib/model-budget";
import { olderTurnSummary } from "@/lib/model-budget";
import { interviewerState } from "@/lib/interviewer-state";
import { discussionReply } from "@/lib/discussion-reply";
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
  const classifyClarification =
    interview?.problem.track === "genai" &&
    interview.phase?.transition === "initial" &&
    latestCandidate?.source !== "control";
  const classifiedClarification = classifyClarification
    ? await genaiClarification(
        interview.problem,
        interview.level,
        messages,
        signal,
      )
    : undefined;
  if (
    latestCandidate?.source !== "control" &&
    isOffTopicRequest(
      latestCandidate?.content ?? "",
      interview?.problem.track === "genai",
    )
  ) {
    signal?.throwIfAborted();
    yield DESIGN_REDIRECT;
    return;
  }
  if (interview && classifiedClarification?.text === GENAI_REPHRASE_REPLY) {
    interview.factAnswer = true;
    yield GENAI_REPHRASE_REPLY;
    return;
  }
  const step = interview?.progress?.step;
  if (
    interview?.problem.track === "genai" &&
    !["drawing", "explaining"].includes(step ?? "")
  ) {
    const assumption = genaiAssumptionReply(
      interview.problem,
      interview.level,
      messages,
    );
    if (assumption && !isFactualQuestion(latestCandidate?.content ?? "")) {
      yield assumption;
      return;
    }
    const estimateVerdict = await genaiEstimateVerdict(
      messages,
      interview,
      signal,
    );
    interview.estimateAccepted = estimateVerdict === "reasonable";
    if (estimateVerdict === "redo") {
      yield "Could you redo that estimate, showing the units and assumptions at each step?";
      return;
    }
  }
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
  const modernModel = /^gpt-6\.1-(?:sol|terra)(?:-|$)/u.test(
    modelSettings("reply").model,
  );
  const clarification =
    interview &&
    latestCandidate &&
    (interview.problem.track === "genai" && !interview.estimateAccepted
      ? classifyClarification
        ? classifiedClarification
        : isFactualQuestion(latestCandidate.content)
          ? await genaiClarification(
              interview.problem,
              interview.level,
              messages,
              signal,
            )
          : undefined
      : configuredClarification(
          interview.problem,
          interview.level,
          latestCandidate.content,
        ));
  const estimateQuestion =
    interview?.phase?.transition === "initial" && step === "discussion"
      ? interview.estimateAccepted
        ? undefined
        : estimationAsk(messages, interview.level, interview.problem.track)
      : undefined;
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
  if (focusedReview && interview && requestedTopic && !modernModel) {
    signal?.throwIfAborted();
    yield await reviewQuestion("", messages, interview, signal);
    return;
  }
  if (clarification?.complete && interview) {
    signal?.throwIfAborted();
    if (interview.problem.track === "genai") interview.factAnswer = true;
    yield clarification.text;
    if (step === "invite-drawing")
      yield `\n\n${interview.problem.drawingPolicy.invitation}`;
    else if (interview.problem.track === "genai") {
      const followUp =
        interview.phase?.transition === "initial" && step === "discussion"
          ? genaiFactFollowUp(messages, clarification.text)
          : undefined;
      if (followUp) yield "\n\n" + followUp;
    } else if (estimateQuestion) yield `\n\n${estimateQuestion}`;
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
    yield step === "explaining" && hasPriorExplanation(messages)
      ? EXPLANATION_UPDATE_REPLY
      : interview?.listening
        ? "I'm reading your explanation."
        : step === "explaining"
          ? EXPLANATION_WAIT_REPLY
          : DRAWING_WAIT_REPLY;
    return;
  }
  if (focusedReview && interview && modernModel && !interview.reviewQuestion) {
    injectDevelopmentModelFailure();
    yield await discussionReply(
      messages,
      interview,
      { summary: diagramText, changes: changeText, image: diagramImage },
      signal,
    );
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
  const stream = await observedModelRequest(
    "reply",
    boundedModelRequest({
      ...modelSettings("reply"),
      instructions:
        interview && modernModel
          ? buildInterviewInstructions({
              problem: interview.problem,
              level: interview.level,
            })
          : interview
            ? buildInterviewInstructions({
                ...interview,
                requirementProposal,
                focusedReview,
              })
            : INTERVIEWER_INSTRUCTIONS,
      input: [
        ...(interview && modernModel
          ? [
              {
                role: "developer" as const,
                content: interviewerState({
                  ...interview,
                  requirementProposal,
                  focusedReview,
                }),
              },
            ]
          : []),
        ...(modernModel && olderTurnSummary(messages, modelMessages).length
          ? [
              {
                role: "user" as const,
                content: JSON.stringify({
                  untrusted_earlier_turn_excerpts: olderTurnSummary(
                    messages,
                    modelMessages,
                  ),
                }),
              },
            ]
          : []),
        ...buildInterviewerInput(
          modelMessages,
          diagramText,
          changeText,
          diagramImage,
        ),
      ],
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
    if (estimateQuestion) yield `${reply ? "\n\n" : ""}${estimateQuestion}`;
    else if (nextQuestion) yield `${reply ? "\n\n" : ""}${nextQuestion}`;
    else if (
      (step === "invite-drawing" ||
        (justCompletedRequirements && interview?.mayInviteDrawing !== false)) &&
      interview
    )
      yield `${reply ? "\n\n" : ""}${interview.problem.drawingPolicy.invitation}`;
    else if (!reply && closing)
      yield "Thanks for walking through your design and its tradeoffs.";
    else if (!reply && clarifying && step === "discussion")
      yield clarificationContinuation(
        messages,
        interview?.level ?? "mid",
        interview?.problem.track,
        interview?.estimateAccepted,
      );
    else if (!reply)
      yield step === "explaining" ? EXPLANATION_WAIT_REPLY : DRAWING_WAIT_REPLY;
  }
}

/** Enforce an actionable ending without regenerating or repeating an entire reply. */
export async function* streamInterviewerReply(
  ...args: Parameters<typeof rawInterviewerReply>
): AsyncGenerator<string> {
  const interview = args[5];
  if (interview?.problem.track === "genai") {
    const capped = cappedGenaiQuestions(
      "genai",
      interview.openQuestions ?? [],
      args[0],
      interview.questionMemory?.topicTurns,
    );
    interview.openQuestions = capped.questions;
    interview.retiredQuestionIds = [
      ...new Set([...(interview.retiredQuestionIds ?? []), ...capped.retired]),
    ];
    if (
      interview.continuedQuestionId &&
      capped.retired.includes(interview.continuedQuestionId)
    ) {
      interview.continuedQuestionId = undefined;
      if (interview.reviewQuestion)
        interview.reviewQuestion = withoutQuestions(interview.reviewQuestion);
    }
  }
  let reply = "";
  for await (const part of rawInterviewerReply(...args)) reply += part;
  reply = trimAcknowledgements(reply);
  if (
    !["drawing", "explaining", "invite-drawing"].includes(
      interview?.progress?.step ?? "",
    ) &&
    !invitesDrawing(reply)
  )
    reply = quoteDiagramLabels(
      reply,
      interview?.diagramLabels ?? [],
      interview?.problem.track,
    );
  if (
    !(interview?.problem.track === "genai" && reply === GENAI_REPHRASE_REPLY) &&
    repeatsLastQuestion(reply, args[0])
  )
    reply = withoutQuestions(reply);
  if (
    interview?.openQuestions?.length &&
    !interview.reviewQuestion &&
    !requestedReviewTopic(args[0]) &&
    interview.progress?.step === "review" &&
    isFactualQuestion(args[0].findLast((m) => m.role === "user")?.content ?? "")
  ) {
    const pending = interview.openQuestions[0];
    interview.continuedQuestionId = pending.id;
    reply = `${withoutQuestions(reply).trim()}\n\n${resumePendingQuestion(pending, args[0])}`;
  }
  if (interview && invitesDrawing(reply)) {
    // Canonical wording also makes the client and next server turn recognize the handoff.
    if (!reply.includes(interview.problem.drawingPolicy.invitation))
      reply = interview.problem.drawingPolicy.invitation;
    yield reply;
    return;
  }
  const ending = interview && clarificationEnding(reply, args[0], interview);
  if (ending) reply += `\n\n${ending}`;
  yield reply;
  if (
    interview?.phase &&
    interview.phase.transition !== "initial" &&
    !["drawing", "explaining"].includes(interview.progress?.step ?? "") &&
    !hasAsk(reply)
  ) {
    const probe = selectReviewProbe(interview.problem, args[0], interview);
    yield "\n\n" +
      quoteDiagramLabels(
        probe?.question ??
          "Please explain one tradeoff in your design and how you would test it.",
        interview.diagramLabels ?? [],
        interview.problem.track,
      );
  }
}
