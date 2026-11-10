import type { ChatMessage } from "@/lib/chat";
import type { InterviewLevel } from "@/lib/interview-selection";
import { questionAtEnd, invitesDrawing } from "@/lib/open-question";
import type { InterviewContext } from "@/lib/interview-instructions";
import { sharedRequirementCriteria } from "@/lib/configured-clarifications";
import { pendingRequirementsQuestion } from "@/lib/requirements-reply";
import { isOffTopicRequest } from "@/lib/off-topic";

/** Keep a clarification conversational without quizzing already supplied requirements. */
export function estimationAsk(messages: ChatMessage[], level: InterviewLevel) {
  if (level === "mid") return undefined;
  const latest = messages.findLast((m) => m.role === "user");
  if (!latest || latest.source === "control" || !/[?？]/u.test(latest.content))
    return undefined;
  const question = latest.content;
  if (
    /\b(?:qps|rps|requests? per second|arithmetic|calculate.*(?:rate|traffic))\b/iu.test(
      question,
    )
  ) {
    return choose(messages, [
      "What average and peak request rates do you estimate from those inputs?",
      "How would you turn those workload inputs into average and peak request rates?",
    ]);
  }
  if (
    /\b(?:estimate|calculate|how much)\b.{0,50}\b(?:storage|bandwidth|capacity)\b/iu.test(
      question,
    )
  )
    return choose(messages, [
      "What capacity do you estimate from those inputs?",
      "Which assumptions would you use for that capacity estimate?",
    ]);
  return undefined;
}
export function clarificationContinuation(
  messages: ChatMessage[],
  level: InterviewLevel,
) {
  return (
    estimationAsk(messages, level) ??
    choose(messages, [
      "Anything else you'd like to clarify before drawing?",
      "Any other requirements you'd like to check?",
      "Is there another constraint you'd like to clarify?",
    ])
  );
}
function choose(messages: ChatMessage[], options: string[]) {
  const previous = questionAtEnd(
    messages.findLast((m) => m.role === "assistant")?.content ?? "",
  );
  return options.find((question) => question !== previous) ?? options[0];
}

/** Facts supplied in this reply count as shared context, not another quiz. */
export function clarificationEnding(
  reply: string,
  messages: ChatMessage[],
  interview: InterviewContext,
) {
  if (
    interview.phase?.transition !== "initial" ||
    ["drawing", "explaining"].includes(interview.progress?.step ?? "") ||
    questionAtEnd(reply) ||
    invitesDrawing(reply) ||
    isOffTopicRequest(
      messages.findLast((m) => m.role === "user")?.content ?? "",
    )
  )
    return undefined;
  const coveredCriteria = [
    ...new Set([
      ...(interview.coveredCriteria ?? []),
      ...sharedRequirementCriteria(interview.problem, interview.level, [
        ...messages,
        { role: "assistant", content: reply },
      ]),
    ]),
  ];
  const missing = pendingRequirementsQuestion(
    { ...interview, coveredCriteria },
    messages,
  );
  return missing &&
    !messages.some((m) => m.role === "assistant" && m.content.includes(missing))
    ? missing
    : clarificationContinuation(messages, interview.level);
}
