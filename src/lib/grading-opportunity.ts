import "server-only";
import type { ProblemDefinition } from "@/lib/problems";
import type { InterviewEndSnapshot } from "@/lib/interview-end";
import { candidateQuotes } from "@/lib/scorecard-quotes";

/** This only checks whether a topic arose. It never awards a score or assumes technical depth. */
export function areaWasExplored(
  problem: ProblemDefinition,
  areaIndex: number,
  snapshot: InterviewEndSnapshot,
): boolean {
  const pattern = problem.rubric[areaIndex]?.assessmentPattern;
  if (!pattern) return true;
  const topic = new RegExp(pattern, "iu");
  if (candidateQuotes(snapshot.messages).some((item) => topic.test(item.quote)))
    return true;
  if (
    snapshot.scene?.elements.some(
      (element) =>
        !element.isDeleted &&
        element.type === "text" &&
        topic.test(element.text),
    )
  )
    return true;
  // Freehand/image content may volunteer a topic that text extraction cannot identify.
  // Keep that uncertainty for the visual grader rather than declaring it unasked.
  if (
    snapshot.diagramImage &&
    snapshot.scene?.elements.some(
      (element) =>
        !element.isDeleted &&
        (element.type === "freedraw" || element.type === "image"),
    )
  )
    return true;
  // The opening's problem description is context, not a follow-up answered by the candidate.
  return snapshot.messages
    .slice(1)
    .some(
      (message) =>
        message.role === "assistant" &&
        message.content
          .split(/(?<=[.!?？])\s+/u)
          .some((sentence) => /[?？]/u.test(sentence) && topic.test(sentence)),
    );
}
