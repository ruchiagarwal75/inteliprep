import type { Scene } from "@/lib/scene";
import { sceneToGraph } from "@/lib/scene-graph";
import { isOffTopicRequest } from "@/lib/off-topic";

/** Ready-to-explain and listening turns must not consume additions before discussion resumes. */
export function pendingDiagramComponents(
  pending: string[],
  scene?: Scene,
  previous?: Scene,
) {
  const current = sceneToGraph(scene).components;
  const before = new Map(
    sceneToGraph(previous).components.map((c) => [c.id, c.label]),
  );
  const live = new Set(current.map((c) => c.label));
  return [
    ...new Set([
      ...pending,
      ...current
        .filter((c) => c.label && before.get(c.id) !== c.label)
        .map((c) => c.label),
    ]),
  ]
    .filter((label) => live.has(label) && !isOffTopicRequest(label))
    .slice(-12);
}
