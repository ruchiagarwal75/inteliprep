import type { Scene } from "@/lib/scene";
import { sceneToGraph, type SceneGraph } from "@/lib/scene-graph";
import {
  formatConnection,
  formatReference,
  formatSection,
  limitDiagramText,
} from "@/lib/diagram-format";

export const MAX_DIAGRAM_TEXT_LENGTH = 4_000;

export function graphToText(graph: SceneGraph): string {
  if (graph.status === "missing")
    return "Whiteboard: no scene was provided for this turn.";
  if (graph.status === "empty")
    return "Whiteboard: empty. No components, connections, or notes are drawn.";
  const groups = new Map<string, string[]>();
  for (const component of graph.components) {
    const heading = formatSection(component, graph.frames);
    const rows = groups.get(heading) ?? [];
    rows.push(
      `- ${formatReference(component)}` +
        (component.labelInferred ? " [label inferred from position]" : ""),
    );
    groups.set(heading, rows);
  }
  const componentLines = [...groups].flatMap(([heading, rows]) =>
    heading ? [heading, ...rows] : rows,
  );
  const connections = graph.connections.map(
    (connection) => `- ${formatConnection(connection)}`,
  );
  const notes = graph.notes.map((note) => {
    const context = formatSection(note, graph.frames);
    return `- ${JSON.stringify(note.text)}${context ? ` (${context})` : ""}`;
  });
  const text = [
    "Components:",
    ...(componentLines.length ? componentLines : ["- none"]),
    "",
    "Connections:",
    ...(connections.length ? connections : ["- none"]),
    "",
    "Notes:",
    ...(notes.length ? notes : ["- none"]),
    ...(graph.frames.length
      ? [
          "",
          "Frames:",
          ...graph.frames.map((frame) => `- ${formatReference(frame)}`),
        ]
      : []),
    ...(graph.unsupported.length
      ? [
          "",
          "Uninterpreted elements:",
          `- ${graph.unsupported.length} element(s) of type ${[...new Set(graph.unsupported.map((element) => element.type))].join(", ")}. Their visual content is unavailable in text.`,
        ]
      : []),
  ].join("\n");
  return limitDiagramText(
    text,
    MAX_DIAGRAM_TEXT_LENGTH,
    "[Diagram text truncated; additional content is omitted.]",
  );
}

/** Describe one current snapshot. Labels are quoted data; no LLM is involved. */
export function sceneToText(scene?: Scene): string {
  return graphToText(sceneToGraph(scene));
}
