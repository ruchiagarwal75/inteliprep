import "server-only";
import type { ProblemDefinition } from "@/lib/problem-definition";
import type { InterviewLevel } from "@/lib/interview-selection";
import type { ChatMessage } from "@/lib/chat";
/** Deliberately answer a single requested fact, even if the candidate bundles questions. */
export function genaiFact(
  problem: ProblemDefinition,
  level: InterviewLevel,
  content: string,
) {
  const matches = problem.genai?.facts
    .map((fact, index) => ({
      fact,
      index,
      offset: content.search(new RegExp(fact.pattern, "iu")),
    }))
    .filter((match) => match.offset >= 0)
    .sort((a, b) => a.offset - b.offset || a.index - b.index);
  const fact = matches?.[0]?.fact;
  return fact
    ? {
        text: fact.answers[level],
        complete: true,
        coveredCriteria: fact.coversCriteria,
      }
    : /what else (?:should|do|can|would) (?:i|we) (?:know|clarify)|(?:all|remaining|other) (?:exercise |problem )?facts/iu.test(
          content,
        )
      ? {
          text: "I can clarify one requirement at a time.",
          complete: true,
          coveredCriteria: [],
        }
      : undefined;
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
