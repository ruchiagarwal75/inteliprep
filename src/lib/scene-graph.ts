import { isSceneComponent, type Scene, type SceneElement } from "@/lib/scene";
import { inferArrowEndpoint, inferTextContainer } from "@/lib/scene-geometry";

export type DiagramReference = { id: string; label: string };
export type DiagramGrouping = {
  frameId: string | null;
  groupId: string | null;
};
export type DiagramComponent = DiagramReference &
  DiagramGrouping & {
    type: "rectangle" | "ellipse" | "diamond";
    labelInferred: boolean;
  };
export type DiagramConnection = {
  id: string;
  start: DiagramReference | null;
  end: DiagramReference | null;
  direction: "->" | "<-" | "<->" | "--";
  label: string | null;
  inferred: boolean;
  markers: string[];
};
export type DiagramNote = DiagramGrouping & { id: string; text: string };
export type SceneGraph = {
  status: "missing" | "empty" | "drawn";
  components: DiagramComponent[];
  connections: DiagramConnection[];
  notes: DiagramNote[];
  frames: DiagramReference[];
  unsupported: { id: string; type: string }[];
};

const directionalHeads = new Set(["arrow", "triangle", "triangle_outline"]);

/** Extract semantics once so the current description and the diff agree. */
export function sceneToGraph(scene?: Scene): SceneGraph {
  const graph: SceneGraph = {
    status: scene ? "empty" : "missing",
    components: [],
    connections: [],
    notes: [],
    frames: [],
    unsupported: [],
  };
  const live =
    scene?.elements.filter(
      (element) => !element.isDeleted && element.type !== "selection",
    ) ?? [];
  if (!live.length) return graph;
  graph.status = "drawn";
  const byId = new Map(live.map((element) => [element.id, element]));
  const components = live.filter(isSceneComponent);
  const labelsByContainer = new Map<string, { id: string; text: string }[]>();
  for (const element of live) {
    if (element.type === "text" && element.containerId && element.text.trim()) {
      const labels = labelsByContainer.get(element.containerId) ?? [];
      labels.push({ id: element.id, text: element.text.trim() });
      labelsByContainer.set(element.containerId, labels);
    }
  }
  const explicitlyLabeled = new Set(labelsByContainer.keys());
  const inferredTextIds = new Set<string>();
  const inferredLabelTargets = new Set<string>();
  for (const element of live) {
    if (element.type !== "text" || element.containerId) continue;
    const container = inferTextContainer(element, components);
    if (!container || explicitlyLabeled.has(container)) continue;
    const labels = labelsByContainer.get(container) ?? [];
    labels.push({ id: element.id, text: element.text.trim() });
    labelsByContainer.set(container, labels);
    inferredTextIds.add(element.id);
    inferredLabelTargets.add(container);
  }

  function attachedLabel(id: string): string | null {
    const labels = labelsByContainer.get(id);
    return (
      labels
        ?.sort((a, b) => a.id.localeCompare(b.id))
        .map((label) => label.text)
        .join(" / ") || null
    );
  }
  function reference(element: SceneElement): DiagramReference {
    const attached = attachedLabel(element.id);
    const label =
      attached ??
      (element.type === "text"
        ? element.text.trim() || "unlabeled text"
        : element.type === "frame" || element.type === "magicframe"
          ? element.name?.trim() || "unlabeled frame"
          : `unlabeled ${element.type}`);
    return { id: element.id, label };
  }
  function grouping(element: SceneElement): DiagramGrouping {
    const frame = element.frameId ? byId.get(element.frameId) : undefined;
    return {
      frameId:
        frame && ["frame", "magicframe"].includes(frame.type) ? frame.id : null,
      groupId: element.groupIds.at(-1) ?? null,
    };
  }
  function endpoint(id: string | undefined): DiagramReference | null {
    const element = id ? byId.get(id) : undefined;
    return element &&
      [
        "rectangle",
        "ellipse",
        "diamond",
        "text",
        "frame",
        "magicframe",
      ].includes(element.type)
      ? reference(element)
      : null;
  }

  graph.components = components.map((component) => ({
    ...reference(component),
    ...grouping(component),
    type: component.type,
    labelInferred: inferredLabelTargets.has(component.id),
  }));
  for (const arrow of live) {
    if (arrow.type !== "arrow") continue;
    const start =
      arrow.startBinding?.elementId ??
      inferArrowEndpoint(arrow, "start", components);
    const end =
      arrow.endBinding?.elementId ??
      inferArrowEndpoint(arrow, "end", components);
    const startHead =
      arrow.startArrowhead !== null &&
      directionalHeads.has(arrow.startArrowhead);
    const endHead =
      arrow.endArrowhead !== null && directionalHeads.has(arrow.endArrowhead);
    graph.connections.push({
      id: arrow.id,
      start: endpoint(start),
      end: endpoint(end),
      direction: startHead ? (endHead ? "<->" : "<-") : endHead ? "->" : "--",
      label: attachedLabel(arrow.id),
      inferred: Boolean(
        (!arrow.startBinding && start) || (!arrow.endBinding && end),
      ),
      markers: [arrow.startArrowhead, arrow.endArrowhead].filter(
        (head): head is NonNullable<typeof head> =>
          head !== null && !directionalHeads.has(head),
      ),
    });
  }
  graph.notes = live.flatMap((element) => {
    if (
      element.type !== "text" ||
      !element.text.trim() ||
      inferredTextIds.has(element.id)
    )
      return [];
    if (element.containerId && byId.has(element.containerId)) return [];
    return [
      { id: element.id, text: element.text.trim(), ...grouping(element) },
    ];
  });
  graph.frames = live
    .filter((element) => ["frame", "magicframe"].includes(element.type))
    .map(reference);
  graph.unsupported = live
    .filter((element) =>
      ["line", "freedraw", "image", "iframe", "embeddable"].includes(
        element.type,
      ),
    )
    .map(({ id, type }) => ({ id, type }));
  return graph;
}
