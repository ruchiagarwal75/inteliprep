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
  if (!latest || latest.source === "control") return undefined;
  const question = latest.content;
  const isQuestion =
    /[?？]/u.test(question) ||
    /^(?:how|what|which|can|could|should|do|does|is|are)\b/iu.test(
      question.trim(),
    );
  if (!isQuestion) {
    if (
      /\d/u.test(question) &&
      /\b(?:estimat\w*|calculat\w*|works? out|i get|assuming|budget|provision|allocate)\b/iu.test(
        question,
      ) &&
      /\b(?:bytes?|[kmgt]i?b|qps|rps|requests?|creates?|reads?|writes?|keys?|counters?|per second|per day|servers?|machines?)\b|\d\s*[kmgt]i?b\b|\/s\b/iu.test(
        question,
      )
    )
      return choose(messages, [
        "Could you walk through that estimate again, showing the units at each step?",
        "What assumptions and arithmetic led you to that estimate?",
      ]);
    return undefined;
  }
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
    /\b(?:estimate|calculate|how much|how many|how large|how big|size|provision|capacity|needed)\b/iu.test(
      question,
    ) &&
    /\b(?:memory|ram|disk|storage|bandwidth|capacity|cache|counters?|machines?|servers?|instances?)\b/iu.test(
      question,
    )
  )
    return choose(messages, [
      "What capacity do you estimate from those inputs, and what state or resources does your design need?",
      "Which assumptions would you use to estimate that resource requirement?",
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
