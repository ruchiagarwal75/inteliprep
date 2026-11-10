import "server-only";
import type { ProblemDefinition } from "@/lib/problem-definition";
import type { InterviewLevel } from "@/lib/interview-selection";
import type { ChatMessage } from "@/lib/chat";
/** Return only validated, explicitly selected IDs, once each and in request order. */
export function genaiFact(
  problem: ProblemDefinition,
  level: InterviewLevel,
  ids: string[],
) {
  const facts = [...new Set(ids)].map((id) =>
    problem.genai?.facts.find((f) => f.id === id),
  );
  if (facts.some((f) => !f)) throw new Error("Unknown GenAI fact ID");
  if (!facts.length) return;
  return {
    text: facts.map((f) => f?.answers[level]).join("\n\n"),
    complete: true,
    coveredCriteria: [
      ...new Set(facts.flatMap((f) => f?.coversCriteria ?? [])),
    ],
  };
}
export function disclosedGenaiFacts(
  problem: ProblemDefinition,
  level: InterviewLevel,
  messages: ChatMessage[],
) {
  return (problem.genai?.facts ?? []).filter((fact) =>
    messages.some(
      (message) =>
        message.role === "assistant" &&
        message.content.includes(fact.answers[level]),
    ),
  );
}
/** Suggestions remain unavailable until a Mid candidate has actually attempted the assumption. */
export function genaiAssumptionReply(
  problem: ProblemDefinition,
  level: InterviewLevel,
  messages: ChatMessage[],
) {
  const latest = messages.findLast((message) => message.role === "user");
  if (!latest || latest.source === "control") return;
  const stuck =
    /\b(?:stuck|unsure|not sure|don't know|do not know|help me|need help)\b/iu.test(
      latest.content,
    );
  const question =
    /[?？]/u.test(latest.content) ||
    /^(?:what|how|which|can|could|should)\b/iu.test(latest.content.trim());
  const rule = problem.genai?.assumptions.find(
    (rule) =>
      (question && new RegExp(rule.pattern, "iu").test(latest.content)) ||
      (stuck &&
        messages.some(
          (message) =>
            message.role === "assistant" &&
            message.content.includes(rule.question),
        )),
  );
  if (!rule) return;
  const attempted = messages.some(
    (message) =>
      message !== latest &&
      message.role === "user" &&
      message.source !== "control" &&
      /\d/u.test(message.content) &&
      new RegExp(rule.pattern, "iu").test(message.content),
  );
  return level === "mid" && stuck && attempted && rule.midSuggestion
    ? rule.midSuggestion +
        " What storage or capacity follows from that assumption?"
    : rule.question;
}
