import type { DiagramConnection, SceneGraph } from "@/lib/scene-graph";
import {
  formatConnection,
  formatReference,
  limitDiagramText,
} from "@/lib/diagram-format";

export const MAX_DIAGRAM_CHANGE_LENGTH = 2_000;

function connectionMeaning(connection: DiagramConnection): string {
  let start = connection.start?.id ?? null;
  let end = connection.end?.id ?? null;
  const direction = connection.direction === "<-" ? "->" : connection.direction;
  if (connection.direction === "<-") [start, end] = [end, start];
  if (["--", "<->"].includes(direction) && (start ?? "") > (end ?? ""))
    [start, end] = [end, start];
  return JSON.stringify([
    start,
    end,
    direction,
    connection.label,
    connection.markers,
  ]);
}

/** Compare semantic entities by ID, ignoring layout and inference confidence. */
export function diffSceneGraphs(
  current: SceneGraph,
  previous?: SceneGraph,
): string {
  if (current.status === "missing")
    return "Diagram changes unavailable: no current scene was provided.";
  if (!previous || previous.status === "missing")
    return "Initial diagram: no previous completed turn to compare.";
  const changes: string[] = [];
  const oldComponents = new Map(
    previous.components.map((component) => [component.id, component]),
  );
  const newComponents = new Map(
    current.components.map((component) => [component.id, component]),
  );
  for (const component of current.components) {
    const old = oldComponents.get(component.id);
    if (!old) changes.push(`Added component: ${formatReference(component)}`);
    else {
      if (old.label !== component.label)
        changes.push(
          `Renamed component: ${JSON.stringify(old.label)} -> ${formatReference(component)}`,
        );
      if (old.type !== component.type)
        changes.push(
          `Changed component shape: ${formatReference(component)} (${old.type} -> ${component.type})`,
        );
      if (
        old.frameId !== component.frameId ||
        old.groupId !== component.groupId
      )
        changes.push(`Regrouped component: ${formatReference(component)}`);
    }
  }
  for (const component of previous.components) {
    if (!newComponents.has(component.id))
      changes.push(`Removed component: ${formatReference(component)}`);
  }
  const oldConnections = new Map(
    previous.connections.map((connection) => [connection.id, connection]),
  );
  const newConnections = new Map(
    current.connections.map((connection) => [connection.id, connection]),
  );
  for (const connection of current.connections) {
    const old = oldConnections.get(connection.id);
    if (!old) changes.push(`Added connection: ${formatConnection(connection)}`);
    else if (connectionMeaning(old) !== connectionMeaning(connection))
      changes.push(
        `Changed connection: ${formatConnection(old)} => ${formatConnection(connection)}`,
      );
  }
  for (const connection of previous.connections) {
    if (!newConnections.has(connection.id))
      changes.push(`Removed connection: ${formatConnection(connection)}`);
  }
  const oldNotes = new Map(previous.notes.map((note) => [note.id, note]));
  const newNotes = new Map(current.notes.map((note) => [note.id, note]));
  for (const note of current.notes) {
    const old = oldNotes.get(note.id);
    if (!old)
      changes.push(
        `Added note: ${JSON.stringify(note.text)} [${JSON.stringify(note.id)}]`,
      );
    else if (
      old.text !== note.text ||
      old.frameId !== note.frameId ||
      old.groupId !== note.groupId
    )
      changes.push(
        `Changed note: ${JSON.stringify(old.text)} -> ${JSON.stringify(note.text)} [${JSON.stringify(note.id)}]`,
      );
  }
  for (const note of previous.notes) {
    if (!newNotes.has(note.id))
      changes.push(
        `Removed note: ${JSON.stringify(note.text)} [${JSON.stringify(note.id)}]`,
      );
  }
  const oldFrames = new Map(previous.frames.map((frame) => [frame.id, frame]));
  const newFrames = new Map(current.frames.map((frame) => [frame.id, frame]));
  for (const frame of current.frames) {
    const old = oldFrames.get(frame.id);
    if (!old) changes.push(`Added frame: ${formatReference(frame)}`);
    else if (old.label !== frame.label)
      changes.push(
        `Renamed frame: ${JSON.stringify(old.label)} -> ${formatReference(frame)}`,
      );
  }
  for (const frame of previous.frames) {
    if (!newFrames.has(frame.id))
      changes.push(`Removed frame: ${formatReference(frame)}`);
  }
  const oldUnsupported = new Map(
    previous.unsupported.map((element) => [element.id, element.type]),
  );
  const newUnsupported = new Set(
    current.unsupported.map((element) => element.id),
  );
  for (const element of current.unsupported) {
    const oldType = oldUnsupported.get(element.id);
    if (!oldType)
      changes.push(
        `Added uninterpreted element: ${element.type} [${JSON.stringify(element.id)}]`,
      );
    else if (oldType !== element.type)
      changes.push(
        `Changed uninterpreted element: ${oldType} -> ${element.type} [${JSON.stringify(element.id)}]`,
      );
  }
  for (const element of previous.unsupported) {
    if (!newUnsupported.has(element.id))
      changes.push(
        `Removed uninterpreted element: ${element.type} [${JSON.stringify(element.id)}]`,
      );
  }
  if (
    !changes.length &&
    !(current.status === "empty" && previous.status === "drawn")
  )
    return "No diagram changes.";
  const header =
    current.status === "empty" && previous.status === "drawn"
      ? "Whiteboard cleared. Changes since the last completed turn:"
      : "Changes since the last completed turn:";
  return limitDiagramText(
    [header, ...changes.map((change) => `- ${change}`)].join("\n"),
    MAX_DIAGRAM_CHANGE_LENGTH,
    "[Diagram changes truncated; additional changes are omitted.]",
  );
}
