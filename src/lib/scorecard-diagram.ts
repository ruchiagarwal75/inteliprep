import type { Scorecard } from "@/lib/scorecard";
import type { InterviewEndSnapshot } from "@/lib/interview-end";
import { diagramConflicts } from "@/lib/diagram-consistency";
import { sceneToGraph } from "@/lib/scene-graph";

export function withDiagramConsistency(
  card: Scorecard,
  snapshot: InterviewEndSnapshot,
): Scorecard {
  const conflicts = diagramConflicts(snapshot.scene, snapshot.messages);
  const note = conflicts
    .map(
      (c) =>
        `Diagram consistency: the final whiteboard labels ${c.drawn}; the explanation describes ${c.spoken}. Clarify which technology and data path you intend.`,
    )
    .join(" ");
  const graph = sceneToGraph(snapshot.scene);
  return {
    ...card,
    areas: card.areas.map((area) => ({
      ...area,
      diagramNote:
        note ||
        (graph.status === "drawn"
          ? "Diagram consistency: no explicit technology conflict was detected in the labeled components. Unlabeled or freehand details may need clarification."
          : "Diagram consistency: no labeled final diagram was available to compare with the explanation."),
    })),
  };
}
