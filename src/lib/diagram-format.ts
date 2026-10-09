import type {
  DiagramConnection,
  DiagramGrouping,
  DiagramReference,
} from "@/lib/scene-graph";

export function formatReference(reference: DiagramReference): string {
  return `${JSON.stringify(reference.label)} [${JSON.stringify(reference.id)}]`;
}

export function formatSection(
  grouping: DiagramGrouping,
  frames: DiagramReference[],
): string {
  const frame = frames.find((frame) => frame.id === grouping.frameId);
  if (frame) return `Frame: ${formatReference(frame)}`;
  return grouping.groupId ? `Group: ${JSON.stringify(grouping.groupId)}` : "";
}

export function formatConnection(connection: DiagramConnection): string {
  const start = connection.start
    ? formatReference(connection.start)
    : "[unresolved endpoint]";
  const end = connection.end
    ? formatReference(connection.end)
    : "[unresolved endpoint]";
  return (
    `${start} ${connection.direction} ${end}` +
    (connection.label ? ` (label: ${JSON.stringify(connection.label)})` : "") +
    (connection.inferred ? " [endpoint inferred from proximity]" : "") +
    (connection.markers.length
      ? ` [endpoint markers: ${connection.markers.join(", ")}]`
      : "")
  );
}

export function limitDiagramText(
  text: string,
  maxLength: number,
  notice: string,
): string {
  if (text.length <= maxLength) return text;
  const prefix = text.slice(0, maxLength - notice.length - 1);
  return `${prefix.slice(0, Math.max(0, prefix.lastIndexOf("\n")))}\n${notice}`;
}
