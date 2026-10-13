import type { Scene } from "@/lib/scene";
import type { ChatMessage } from "@/lib/chat";
import { sceneToGraph } from "@/lib/scene-graph";

/** Ask about contradictions in the candidate's own design, without prescribing it. */
export function diagramReviewQuestion(
  scene: Scene | undefined,
  messages: ChatMessage[],
): string | undefined {
  const graph = sceneToGraph(scene);
  if (graph.status !== "drawn") return undefined;
  const asked = (question: string) =>
    messages.some(
      (message) =>
        message.role === "assistant" && message.content.includes(question),
    );
  // Freehand or unresolved arrows may contain a path the semantic graph misses.
  const uncertain =
    graph.unsupported.length > 0 ||
    graph.connections.some((edge) => !edge.start || !edge.end || edge.inferred);
  if (!uncertain) {
    const apps = graph.components.filter((node) =>
      /\b(?:app(?:lication)?\s*\d*|web(?: server)?\s*\d*|api(?: server)?\s*\d*)\b/iu.test(
        node.label,
      ),
    );
    const stores = new Set(
      graph.components
        .filter((node) =>
          /\b(?:db|database|postgres(?:ql)?|mysql|mongo(?:db)?|data store)\b/iu.test(
            node.label,
          ),
        )
        .map((node) => node.id),
    );
    const adjacent = new Map<string, string[]>();
    function connect(start: string, end: string) {
      adjacent.set(start, [...(adjacent.get(start) ?? []), end]);
    }
    for (const edge of graph.connections) {
      if (!edge.start || !edge.end) continue;
      if (edge.direction !== "<-") connect(edge.start.id, edge.end.id);
      if (edge.direction !== "->") connect(edge.end.id, edge.start.id);
    }
    function hasDataPath(start: string) {
      const visited = new Set<string>();
      const pending = [start];
      for (const id of pending) {
        if (stores.has(id)) return true;
        if (visited.has(id)) continue;
        visited.add(id);
        pending.push(...(adjacent.get(id) ?? []));
      }
      return false;
    }
    if (
      apps.length > 1 &&
      stores.size &&
      apps.some((node) => hasDataPath(node.id))
    ) {
      for (const app of apps.filter((node) => !hasDataPath(node.id))) {
        const question = `How does ${JSON.stringify(app.label)} read or write data? I don't see a path from it to the database in the current drawing.`;
        if (!asked(question)) return question;
      }
    }
  }
  const candidateText = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n");
  const drawnText = [
    ...graph.components.map((node) => node.label),
    ...graph.notes.map((note) => note.text),
  ].join("\n");
  for (const component of ["cache", "CDN"]) {
    const pattern = new RegExp(`\\b${component}\\b`, "iu");
    if (pattern.test(candidateText) && !pattern.test(drawnText)) {
      const question = uncertain
        ? `You mentioned a ${component}. Could you point out where it sits in your drawing and explain its request path?`
        : `You mentioned a ${component}, but I don't see it labeled in the current drawing. Where does it sit on the request path?`;
      if (!asked(question)) return question;
    }
  }
  return undefined;
}
