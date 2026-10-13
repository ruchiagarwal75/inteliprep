import type { ScoreEvidence } from "@/lib/scorecard";
import type { Scene } from "@/lib/scene";
import { sceneToGraph } from "@/lib/scene-graph";

export function ScorecardEvidence({
  evidence,
  scene,
}: {
  evidence: ScoreEvidence[];
  scene?: Scene;
}) {
  if (!evidence.length) return null;
  const graph = sceneToGraph(scene);
  function label(id: string): string {
    const component = graph.components.find((item) => item.id === id);
    if (component) return component.label;
    const connection = graph.connections.find((item) => item.id === id);
    if (connection)
      return (
        connection.label ??
        `${connection.start?.label ?? "Unresolved"} ${connection.direction} ${connection.end?.label ?? "unresolved"}`
      );
    const note = graph.notes.find((item) => item.id === id);
    if (note) return note.text;
    const frame = graph.frames.find((item) => item.id === id);
    if (frame) return frame.label;
    const element = scene?.elements.find((item) => item.id === id);
    return element?.type === "text"
      ? element.text
      : element?.type === "freedraw"
        ? "Freehand drawing"
        : "Drawn element";
  }
  return (
    <ul className="mt-2 space-y-2 text-xs text-black/60 dark:text-white/60">
      {evidence.map((item, index) => (
        <li
          key={index}
          className="border-l-2 border-black/15 pl-2 dark:border-white/20"
        >
          {item.kind === "message" ? (
            <blockquote className="whitespace-pre-wrap">
              You said: “{item.quote}”
            </blockquote>
          ) : (
            <p>Diagram reference: {label(item.elementId)}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
