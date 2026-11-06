import "server-only";
import type { ChatMessage } from "@/lib/chat";
import type { ProblemDefinition } from "@/lib/problems";
import { areaWasExplored } from "@/lib/grading-opportunity";
import { candidateEvidenceExcerpts } from "@/lib/candidate-evidence";
import { plainInterviewerText } from "@/lib/interviewer-reply-filter";
import { isOffTopicRequest, DESIGN_REDIRECT } from "@/lib/off-topic";
const normalized = (text: string) =>
  plainInterviewerText(text).toLowerCase().replace(/\s+/gu, " ").trim();
export const isGenericProbe = (text: string) =>
  /what limitation of your current design|what (?:would you|do you) (?:like|want) to (?:examine|discuss|explore) next/iu.test(
    text,
  );
export const latestCandidate = (messages: ChatMessage[]) =>
  messages.findLast((message) => message.role === "user");
export function requestedReviewTopic(
  messages: ChatMessage[],
): string | undefined {
  const latest = latestCandidate(messages);
  if (!latest || latest.source === "control") return;
  if (
    /^(?:let['’]s|let us)\s+(?:discuss|review)\s+(?:my|the|this)\s+(?:design|drawing|diagram|architecture)[.!?\s]*$/iu.test(
      latest.content,
    )
  )
    return;
  if (
    /(?:let['’]s|let us|can we|could we|i['’]d like to|i want to|please)\s+(?:look at|focus on|discuss|explore|examine|go into)\b|^(?:provider outage|revocation|retries|failure recovery)$/iu.test(
      latest.content,
    )
  )
    return latest.content;
}
export function wasProbeAsked(
  question: string,
  messages: ChatMessage[],
): boolean {
  const text = normalized(question);
  return messages.some(
    (message) =>
      message.role === "assistant" &&
      normalized(message.content).includes(text),
  );
}
/** Prefer the named/current thread, then an unexplored rubric area, and never reuse a question. */
export function selectReviewProbe(
  problem: ProblemDefinition,
  messages: ChatMessage[],
) {
  const probes = problem.reviewProbes.length
    ? problem.reviewProbes
    : problem.followUps.map((question, index) => ({
        id: "follow-up-" + index,
        question,
        areaIndex: Math.min(index, problem.rubric.length - 1),
        topicPattern:
          problem.rubric[Math.min(index, problem.rubric.length - 1)]
            .assessmentPattern ?? "(?!)",
      }));
  const latest = latestCandidate(messages);
  const topic = requestedReviewTopic(messages);
  const answer = latest && latest.source !== "control" ? latest.content : "";
  const previous =
    latest?.source === "control"
      ? ""
      : (messages.findLast(
          (message) =>
            message.role === "assistant" && /[?？]/u.test(message.content),
        )?.content ?? "");
  return probes
    .filter(
      (probe) =>
        !wasProbeAsked(probe.question, messages) &&
        !isGenericProbe(probe.question),
    )
    .map((probe, index) => ({
      probe,
      index,
      score:
        (topic && new RegExp(probe.topicPattern, "iu").test(topic) ? 100 : 0) +
        (!topic &&
        new RegExp(probe.topicPattern, "iu").test(answer + " " + previous)
          ? 30
          : 0) +
        (!areaWasExplored(problem, probe.areaIndex, { messages }) ? 10 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.probe;
}
export function acknowledgeAnswer(
  messages: ChatMessage[],
  text: string,
  quote: string,
): string {
  const latest = latestCandidate(messages);
  if (!latest || latest.source === "control" || requestedReviewTopic(messages))
    return "";
  if (
    !messages.some(
      (message) =>
        message.role === "assistant" && /[?？]/u.test(message.content),
    )
  )
    return "";
  const excerpts = candidateEvidenceExcerpts(latest);
  if (!excerpts.length) return "";
  if (isOffTopicRequest(latest.content)) return DESIGN_REDIRECT;
  if (quote.trim() && excerpts.some((excerpt) => excerpt.includes(quote)))
    return plainInterviewerText(text)
      .replace(/[?？][\s\S]*$/u, "")
      .trim();
  return "";
}
