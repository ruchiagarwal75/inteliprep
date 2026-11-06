import type { InterviewEndSnapshot } from "@/lib/interview-end";
import { sceneToGraph } from "@/lib/scene-graph";
import { diagramStores } from "@/lib/diagram-consistency";
import { isOffTopicRequest } from "@/lib/off-topic";

export type DiagramConsistencyFinding = {
  kind: "technology" | "missing_component";
  text: string;
  resolved: boolean;
};
const components = [
  { name: "Load balancer", pattern: /\b(?:load[- ]balancer|lb)\b/iu },
  { name: "CDN", pattern: /\b(?:cdn|content delivery network)\b/iu },
  { name: "Redis cache", pattern: /\bredis\b/iu },
  {
    name: "Message queue",
    pattern: /\b(?:message queue|kafka|rabbitmq|sqs)\b/iu,
  },
  { name: "ZooKeeper", pattern: /\bzookeeper\b/iu },
];
function isRejected(text: string, pattern: RegExp) {
  return new RegExp(
    `\\b(?:not|without|instead of|rather than|remove|drop|don't use|do not use)\\s+(?:a |the )?${pattern.source}`,
    "iu",
  ).test(text);
}

/** Compare every stated choice, then check later corrections, against the final semantic board. */
export function auditDiagram(
  snapshot: InterviewEndSnapshot,
): DiagramConsistencyFinding[] {
  const graph = sceneToGraph(snapshot.scene);
  if (!graph.components.length) return [];
  const statements = snapshot.messages.flatMap((message, messageIndex) =>
    message.role !== "user" ||
    message.source === "control" ||
    isOffTopicRequest(message.content)
      ? []
      : message.content
          .split(/(?<=[.!?])\s+|\n/gu)
          .filter((text) => !/[?？]\s*$/u.test(text))
          .map((text) => ({ text, messageIndex })),
  );
  const drawn = diagramStores.filter((store) =>
    graph.components.some((node) => store.pattern.test(node.label)),
  );
  const findings: DiagramConsistencyFinding[] = [];
  for (const store of diagramStores) {
    if (!drawn.length || drawn.includes(store)) continue;
    const first = statements.findIndex(
      (s) => store.pattern.test(s.text) && !isRejected(s.text, store.pattern),
    );
    if (first < 0) continue;
    const correction = statements
      .slice(first + 1)
      .findLast(
        (s) =>
          drawn.some(
            (d) => d.pattern.test(s.text) && !isRejected(s.text, d.pattern),
          ) || isRejected(s.text, store.pattern),
      );
    const resolved = Boolean(correction);
    const labels = graph.components
      .filter((node) => drawn.some((d) => d.pattern.test(node.label)))
      .map((node) => node.label)
      .join(", ");
    findings.push({
      kind: "technology",
      resolved,
      text: `${store.name} was named in chat while the final whiteboard shows ${labels}. ${resolved ? "Clarified later in the conversation: the earlier database choice was corrected." : "Unresolved: clarify which database and data path is intended."}`,
    });
  }
  for (const component of components) {
    if (graph.components.some((node) => component.pattern.test(node.label)))
      continue;
    const first = statements.findIndex(
      (s) =>
        component.pattern.test(s.text) &&
        !isRejected(s.text, component.pattern),
    );
    if (first < 0) continue;
    const resolved = statements
      .slice(first + 1)
      .some((s) => isRejected(s.text, component.pattern));
    findings.push({
      kind: "missing_component",
      resolved,
      text: `${component.name} was described in chat but is not labeled in the final diagram. ${resolved ? "Resolved later: the candidate withdrew this component." : graph.unsupported.length ? "Unresolved in the text summary; freehand or image details may need clarification." : "Unresolved: the stated component is missing from the drawing."}`,
    });
  }
  return findings;
}
