import type { Scorecard } from "@/lib/scorecard";
import type { InterviewEndSnapshot } from "@/lib/interview-end";
import { auditDiagram } from "@/lib/diagram-audit";

export function withDiagramConsistency(
  card: Scorecard,
  snapshot: InterviewEndSnapshot,
  track: "core" | "genai" = "core",
): Scorecard {
  if (card.notScoredReason) return card;
  return {
    ...card,
    diagramConsistency: auditDiagram(snapshot, track),
    areas: card.areas.map((area) => ({
      ...area,
      diagramNote: undefined,
    })),
  };
}
