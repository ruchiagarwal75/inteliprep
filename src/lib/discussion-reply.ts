import "server-only";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import type { ChatMessage } from "@/lib/chat";
import type { InterviewContext } from "@/lib/interview-instructions";
import { buildInterviewInstructions } from "@/lib/interview-instructions";
import { interviewerState } from "@/lib/interviewer-state";
import { observedModelRequest } from "@/lib/observed-model-request";
import { modelSettings } from "@/lib/model-settings";
import { boundedModelRequest } from "@/lib/model-request";
import { boundedModelMessages, olderTurnSummary } from "@/lib/model-budget";
import { candidateQuotes } from "@/lib/scorecard-quotes";
import {
  stageProbes,
  requestedReviewTopic,
  selectReviewProbe,
  acknowledgeAnswer,
  wasProbeAsked,
  isGenericProbe,
} from "@/lib/review-probes";
import {
  interviewerReplyFilter,
  removeCandidateEcho,
} from "@/lib/interviewer-reply-filter";
import { trimAcknowledgements } from "@/lib/question-memory";

import { availableTopicProbes, probeTopic } from "@/lib/probe-topics";
import {
  verifiedQuestionAnswers,
  unresolvedQuestions,
} from "@/lib/open-question-queue";

const schema = z.object({
  topicId: z.string(),
  question: z.string(),
  acknowledgement: z.string(),
  acknowledgementQuote: z.string(),
  answers: z.array(z.object({ questionId: z.string(), quoteId: z.string() })),
  covered: z.array(z.object({ topicId: z.string(), quoteId: z.string() })),
});

/** One structured generation replaces draft -> review -> review rewrite waterfalls. */
export async function discussionReply(
  messages: ChatMessage[],
  interview: InterviewContext,
  whiteboard: { summary: string; changes: string; image?: string },
  signal?: AbortSignal,
) {
  const probes = availableTopicProbes(
    stageProbes(interview.problem, interview.phase),
    interview.questionMemory?.topicTurns,
    requestedReviewTopic(messages),
  );
  interview.allowedFollowUps = probes.map(({ id, question }) => ({
    id,
    question,
  }));
  const recent = boundedModelMessages(messages);
  const allQuotes = candidateQuotes(messages);
  const oldest = Math.min(
    messages.length - 9,
    ...(interview.openQuestions ?? []).map((q) => q.afterMessageIndex),
  );
  const quotes = allQuotes.filter((q) => q.messageIndex > oldest).slice(-40);
  const payload = JSON.stringify({
    recent_messages: recent,
    earlier_turn_excerpts: olderTurnSummary(messages, recent),
    candidate_quotes: quotes,
    whiteboard_label: "Candidate’s current whiteboard",
    current_whiteboard_snapshot: whiteboard.summary,
    whiteboard_changes: whiteboard.changes,
  });
  const response = await observedModelRequest(
    "question_review",
    boundedModelRequest({
      ...modelSettings("question_review"),
      instructions:
        buildInterviewInstructions({
          problem: interview.problem,
          level: interview.level,
        }) +
        "\n\nReturn one specific unanswered question from the allowed current-stage topics. topicId must name one allowed follow-up. Adapt its question to the latest technical answer; do not repeat the follow-up bank mechanically. Ask exactly one question. Supply one brief critical or neutral acknowledgement grounded in acknowledgementQuote from the latest technical candidate answer; use empty strings for controls or topic choices. Mark a topic covered only with a real candidate quoteId that establishes its mechanism. Never mark a topic covered from an interviewer message. In answers, mark a pending question answered only by a concrete relevant candidate quote AFTER it was asked. A side question is not an answer. Continue the oldest unanswered pending question before choosing a new topic. New diagram components alone do not prove a mechanism: refer to their exact names when resuming their related question. If all pending questions are answered, probe an uncovered topic; do not spend more than three follow-ups on one topic. If diagram_updates is nonempty, leave acknowledgement empty because the server acknowledges the diagram. Never ask about a covered topic again; probe another distinct boundary. No markdown, praise, verbatim candidate quotes, or generic topic invitations.",
      input: [
        { role: "developer", content: interviewerState(interview) },
        {
          role: "user",
          content: whiteboard.image
            ? [
                { type: "input_text", text: payload },
                {
                  type: "input_image",
                  image_url: whiteboard.image,
                  detail: "high",
                },
              ]
            : payload,
        },
      ],
      text: { format: zodTextFormat(schema, "discussion_follow_up") },
    }),
    { signal, timeout: 12_000, maxRetries: 0 },
  );
  let body: unknown;
  try {
    body = JSON.parse(response.output_text);
  } catch {
    /* A malformed result uses a specific unasked stage probe. */
  }
  const parsed =
    response.status === "completed" ? schema.safeParse(body) : undefined;
  const value = parsed?.success ? parsed.data : undefined;
  if (value)
    for (const covered of value.covered) {
      const probe = probes.find((p) => p.id === covered.topicId);
      const quote = quotes.find((q) => q.quoteId === covered.quoteId);
      if (
        probe &&
        quote &&
        new RegExp(probe.topicPattern, "iu").test(quote.quote)
      )
        interview.questionMemory?.coveredTopics.push(probe.question);
    }
  const resolved = value
    ? verifiedQuestionAnswers(
        interview.openQuestions ?? [],
        value.answers,
        quotes,
      )
    : [];
  interview.answeredQuestionIds?.push(...resolved);
  const pending = unresolvedQuestions(
    interview.openQuestions ?? [],
    resolved,
  ).find(
    (q) =>
      q.topicId === "diagram_consistency" ||
      !q.topicId ||
      (interview.questionMemory?.topicTurns?.[q.topicId] ?? 0) < 3,
  );
  if (pending) {
    interview.selectedTopic = pending.topicId;
    return pending.question;
  }
  if (interview.diagramQuestion) {
    interview.selectedTopic = "diagram_consistency";
    return interview.diagramQuestion;
  }
  const filter = interviewerReplyFilter(messages);
  const question = value ? filter.push(value.question) + filter.finish() : "";
  const valid =
    value &&
    probes.some((p) => p.id === value.topicId) &&
    /[?？]\s*$/u.test(question) &&
    !isGenericProbe(question) &&
    !wasProbeAsked(question, messages);
  const selected = valid
    ? question
    : selectReviewProbe(interview.problem, messages, interview)?.question;
  const selectedProbe = valid
    ? probes.find((p) => p.id === value.topicId)
    : selectReviewProbe(interview.problem, messages, interview);
  interview.selectedTopic = selectedProbe
    ? probeTopic(selectedProbe)
    : undefined;
  const acknowledgement =
    value && !interview.diagramUpdates?.length
      ? acknowledgeAnswer(
          messages,
          value.acknowledgement,
          value.acknowledgementQuote,
        )
      : "";
  return trimAcknowledgements(
    removeCandidateEcho(
      [
        acknowledgement,
        selected ??
          "Please choose Pause to draw to update your design, or explain a concrete tradeoff in the current request path.",
      ]
        .filter(Boolean)
        .join(" "),
      messages,
    ),
  );
}
