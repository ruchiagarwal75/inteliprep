import type { Scorecard } from "@/lib/scorecard";
import type { InterviewEndSnapshot } from "@/lib/interview-end";
import { auditDiagram } from "@/lib/diagram-audit";

export function withDiagramConsistency(
  card: Scorecard,
  snapshot: InterviewEndSnapshot,
): Scorecard {
  if (card.notScoredReason) return card;
  return {
    ...card,
    diagramConsistency: auditDiagram(snapshot),
    areas: card.areas.map((area) => ({
      ...area,
      diagramNote: undefined,
    })),
  };
}
