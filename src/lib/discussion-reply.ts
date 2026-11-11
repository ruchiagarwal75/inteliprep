import { continueDiscussion } from "@/lib/discussion-exhaustion";
import { eligibleDiscussionProbes } from "@/lib/genai-probe-memory";
import { genaiDiscussionQuotes } from "@/lib/genai-discussion-quotes";
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
  wasProbeAsked,
  isGenericProbe,
} from "@/lib/review-probes";
import {
  interviewerReplyFilter,
  removeCandidateEcho,
} from "@/lib/interviewer-reply-filter";
import { trimAcknowledgements } from "@/lib/question-memory";

import {
  verifiedQuestionAnswers,
  unresolvedQuestions,
} from "@/lib/open-question-queue";

import { discussionAcknowledgement } from "@/lib/discussion-acknowledgement";
import { resumePendingQuestion } from "@/lib/pending-question-reply";
import {
  focusGenaiProbes,
  questionMatchesGenaiTopic,
} from "@/lib/genai-probes";

const schema = z.object({
  continuesQuestionId: z.string(),
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
  const probes = focusGenaiProbes(
    interview.problem.track,
    eligibleDiscussionProbes(
      interview.problem.track,
      stageProbes(
        interview.problem,
        interview.phase,
        interview.designText ?? interview.diagramLabels?.join(" "),
      ),
      interview.questionMemory,
      requestedReviewTopic(messages),
    ),
    requestedReviewTopic(messages),
  );
  interview.allowedFollowUps = probes.map(({ id, question }) => ({
    id,
    question,
  }));
  if (
    !probes.length &&
    !interview.openQuestions?.length &&
    !interview.diagramQuestion
  )
    return continueDiscussion(messages, interview, signal);
  const recent = boundedModelMessages(messages);
  const allQuotes = candidateQuotes(messages);
  const oldest = Math.min(
    messages.length - 9,
    ...(interview.openQuestions ?? []).map((q) => q.afterMessageIndex),
  );
  const quotes =
    interview.problem.track === "genai"
      ? genaiDiscussionQuotes(messages)
      : allQuotes.filter((q) => q.messageIndex > oldest).slice(-40);
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
        "\n\nReturn one specific unanswered question from the allowed current-stage topics. For a new bank issue, topicId must name one allowed follow-up; while continuing a pending question, use its saved topicId instead. Adapt its question to the latest technical answer; do not repeat the follow-up bank mechanically. Ask exactly one question. Supply one brief critical or neutral acknowledgement, with acknowledgementQuote set to a supplied quoteId from the latest technical candidate answer; use empty strings for controls or topic choices. Mark a topic covered only with a real candidate quoteId that establishes its mechanism. Never mark a topic covered from an interviewer message. In answers, mark a pending question answered only by a concrete relevant candidate quote AFTER it was asked. A side question is not an answer. Continue the oldest unanswered pending question before choosing a new topic. Set continuesQuestionId to that question's exact ID, otherwise use an empty string. Briefly acknowledge the latest technical point even when it answers a different topic, then reword or narrow the outstanding question. Never repeat the original question or previous interviewer question verbatim. Keep its underlying unresolved issue; do not replace it with a new topic. New diagram components alone do not prove a mechanism: refer to their exact names when resuming their related question. If all pending questions are answered, probe an uncovered topic; never spend more than two asks on an issue across the whole interview, including previous stages. Do not list or read back diagram components. Choose the most consequential request path, correctness risk or unresolved tradeoff in this stage and ask one concrete question about it. Use actual component names naturally. When diagram_updates is nonempty, incorporate a relevant new component in that question, especially when it relates to a pending question; a short acknowledgement may name that one change but never inventory the drawing. Never ask about a covered topic again; probe another distinct boundary. No markdown, praise, verbatim candidate quotes, or generic topic invitations." +
        (interview.problem.track === "genai"
          ? " For this GenAI discussion, return empty acknowledgement and acknowledgementQuote fields. Ask the next question directly, without praise, criticism or a transition judging the answer or saying what remains unspecified. Earlier candidate explanations count even when given before a pending question. The AFTER-it-was-asked restriction does not apply here. Check all supplied candidate quotes before asking. Mark an issue covered only when a quote establishes its mechanism, not a component name or buzzword. If an answer is partial, acknowledge the part it answered and ask only about the specific unresolved gap. Do not ask the broad question again or make a candidate repeat a complete answer. Never make more than two attempts on the same issue; move to an uncovered topic afterward."
          : ""),
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
      const probe = interview.problem.reviewProbes.find(
        (p) => p.id === covered.topicId,
      );
      const quote = quotes.find((q) => q.quoteId === covered.quoteId);
      if (probe && quote)
        interview.questionMemory?.coveredTopics.push(
          probe.question,
          "issue:" + probe.id,
        );
    }
  const resolved = value
    ? verifiedQuestionAnswers(
        interview.openQuestions ?? [],
        value.answers,
        quotes,
        interview.problem.track === "genai",
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
      (interview.questionMemory?.topicTurns?.[q.topicId] ?? 0) < 2,
  );
  if (pending) {
    interview.selectedTopic = pending.topicId;
    interview.continuedQuestionId = pending.id;
    return trimAcknowledgements(
      removeCandidateEcho(
        [
          value
            ? discussionAcknowledgement(
                messages,
                value,
                quotes,
                interview.problem.track,
              )
            : "",
          resumePendingQuestion(
            pending,
            messages,
            value?.question,
            value?.continuesQuestionId,
          ),
        ]
          .filter(Boolean)
          .join(" "),
        messages,
      ),
    );
  }
  if (interview.diagramQuestion) {
    interview.selectedTopic = "diagram_consistency";
    return interview.diagramQuestion;
  }
  const filter = interviewerReplyFilter(messages);
  const question = value ? filter.push(value.question) + filter.finish() : "";
  const valid =
    value &&
    eligibleDiscussionProbes(
      interview.problem.track,
      probes,
      interview.questionMemory,
    ).some((p) => p.id === value.topicId) &&
    questionMatchesGenaiTopic(
      interview.problem.track,
      probes.find((p) => p.id === value.topicId),
      question,
    ) &&
    /[?？]\s*$/u.test(question) &&
    !isGenericProbe(question) &&
    !wasProbeAsked(question, messages);
  const selected = valid
    ? question
    : selectReviewProbe(interview.problem, messages, interview)?.question;
  const selectedProbe = valid
    ? probes.find((p) => p.id === value.topicId)
    : selectReviewProbe(interview.problem, messages, interview);
  interview.selectedTopic = selectedProbe ? selectedProbe.id : undefined;
  const acknowledgement = value
    ? discussionAcknowledgement(
        messages,
        value,
        quotes,
        interview.problem.track,
      )
    : "";
  return trimAcknowledgements(
    removeCandidateEcho(
      [
        acknowledgement,
        selected ?? (await continueDiscussion(messages, interview, signal)),
      ]
        .filter(Boolean)
        .join(" "),
      messages,
    ),
  );
}
