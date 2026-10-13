import "server-only";
import type { ChatMessage } from "@/lib/chat";
import type { ProblemDefinition } from "@/lib/problems";
import type { InterviewLevel } from "@/lib/interview-selection";

export function isFactualQuestion(content: string): boolean {
  return (
    /[?？]/u.test(content) ||
    /^(?:what|how|when|where|why|which|is|are|does|do|can|could|would|should)\b/iu.test(
      content.trim(),
    )
  );
}

/** Only explicitly configured facts can answer clarifications without a model. */
export function configuredClarification(
  problem: ProblemDefinition,
  level: InterviewLevel,
  content: string,
) {
  if (!isFactualQuestion(content)) return undefined;
  // A question about how to solve the design is not a request for exercise facts.
  if (
    /^(?:how (?:would|should|can|do|will) (?:i|we|you)\b|should (?:i|we) (?:add|use|implement|choose|scale)\b)/iu.test(
      content.trim(),
    )
  )
    return undefined;
  const matches = problem.clarifications.filter((entry) =>
    new RegExp(entry.pattern, "iu").test(content),
  );
  if (!matches.length) return undefined;
  return {
    text: matches.map((entry) => entry.answers[level]).join("\n\n"),
    coveredCriteria: [
      ...new Set(matches.flatMap((entry) => entry.coversCriteria)),
    ],
  };
}

/** Shared requirement facts advance setup only; they never earn technical scores. */
export function sharedRequirementCriteria(
  problem: ProblemDefinition,
  level: InterviewLevel,
  messages: ChatMessage[],
) {
  const criteria = new Set(problem.openingCriteria);
  for (const entry of problem.clarifications) {
    if (
      messages.some(
        (message) =>
          message.role === "assistant" &&
          (message.content.includes(entry.answers[level]) ||
            Boolean(
              entry.sharedAnswerPattern &&
              new RegExp(entry.sharedAnswerPattern, "iu").test(message.content),
            )),
      )
    )
      entry.coversCriteria.forEach((index) => criteria.add(index));
  }
  const latest = messages.findLast((message) => message.role === "user");
  if (latest)
    configuredClarification(
      problem,
      level,
      latest.content,
    )?.coveredCriteria.forEach((index) => criteria.add(index));
  return [...criteria];
}
