import { disclosedGenaiFacts } from "@/lib/genai-facts";
import "server-only";
import type { ChatMessage } from "@/lib/chat";
import type { ProblemDefinition } from "@/lib/problems";
import type { InterviewLevel } from "@/lib/interview-selection";
import { exactSentences } from "@/lib/exact-sentences";
import { isCandidateProposal } from "@/lib/candidate-proposal";
import { clarificationParts } from "@/lib/clarification-parts";
import { normalizeSharedFacts } from "@/lib/shared-facts";

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
  if (!isFactualQuestion(content) || isCandidateProposal(content))
    return undefined;
  // A question about how to solve the design is not a request for exercise facts.
  if (
    /^(?:how (?:would|should|can|do|will) (?:i|we|you)\b|should (?:i|we) (?:add|use|implement|choose|scale)\b)/iu.test(
      content.trim(),
    )
  )
    return undefined;
  if (problem.track === "genai") return undefined;
  const matches = problem.clarifications.filter((entry) =>
    new RegExp(entry.pattern, "iu").test(content),
  );
  if (!matches.length) return undefined;
  const seen = new Set<string>();
  const paragraphs = matches
    .map((entry) =>
      exactSentences(entry.answers[level])
        .filter((sentence) => {
          const key = sentence.toLowerCase().replace(/\s+/gu, " ");
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .join(" "),
    )
    .filter(Boolean);
  return {
    text: paragraphs.join("\n\n"),
    complete: clarificationParts(content).every((part) =>
      problem.clarifications.some((entry) =>
        new RegExp(entry.pattern, "iu").test(part),
      ),
    ),
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
  const sharedMessages = [
    problem.levels[level].openingMessage,
    ...messages
      .filter((message) => message.role === "assistant")
      .map((message) => message.content),
  ];
  const sharedText = normalizeSharedFacts(sharedMessages.join("\n"));
  for (const entry of problem.clarifications) {
    if (
      (entry.sharedAnswerPatterns &&
        new RegExp(entry.sharedAnswerPatterns[level], "iu").test(sharedText)) ||
      sharedMessages.some(
        (content) =>
          content.includes(entry.answers[level]) ||
          Boolean(
            entry.sharedAnswerPattern &&
            new RegExp(entry.sharedAnswerPattern, "iu").test(content),
          ),
      )
    )
      entry.coversCriteria.forEach((index) => criteria.add(index));
  }
  if (problem.track === "genai")
    for (const fact of disclosedGenaiFacts(problem, level, messages))
      fact.coversCriteria.forEach((index) => criteria.add(index));
  const latest = messages.findLast((message) => message.role === "user");
  if (latest)
    configuredClarification(
      problem,
      level,
      latest.content,
    )?.coveredCriteria.forEach((index) => criteria.add(index));
  return [...criteria];
}
