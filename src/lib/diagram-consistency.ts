import type { Scene } from "@/lib/scene";
import type { ChatMessage } from "@/lib/chat";
import { sceneToGraph } from "@/lib/scene-graph";

export const diagramStores = [
  { name: "PostgreSQL", pattern: /\bpostgres(?:ql)?\b/iu },
  { name: "Cassandra", pattern: /\bcassandra\b/iu },
  { name: "MySQL", pattern: /\bmysql\b/iu },
  { name: "MongoDB", pattern: /\bmongo(?:db)?\b/iu },
  { name: "DynamoDB", pattern: /\bdynamodb\b/iu },
];
const stores = diagramStores;

/** Only affirmative design statements are compared; questions and rejected options aren't choices. */
export function diagramConflicts(
  scene: Scene | undefined,
  messages: ChatMessage[],
) {
  const graph = sceneToGraph(scene);
  if (graph.status !== "drawn") return [];
  const statements = messages
    .filter((m) => m.role === "user" && m.source !== "control")
    .flatMap((m) => m.content.split(/[.!;,\n]/u))
    .filter(
      (s) =>
        !s.includes("?") &&
        !/\b(?:not|instead of|rather than|replace|remove|without)\b/iu.test(s),
    );
  const latestChoice =
    statements.findLast((s) => stores.some((store) => store.pattern.test(s))) ??
    "";
  const spoken = stores.filter((store) => store.pattern.test(latestChoice));
  const drawn = stores.filter((store) =>
    graph.components.some((n) => store.pattern.test(n.label)),
  );
  return spoken
    .filter((store) => !drawn.includes(store) && drawn.length > 0)
    .map((store) => ({
      spoken: store.name,
      drawn: graph.components
        .filter((n) =>
          stores.some((s) => s !== store && s.pattern.test(n.label)),
        )
        .slice(0, 3)
        .map((n) => n.label.slice(0, 120))
        .join(", "),
    }));
}

export function diagramConsistencyQuestion(
  scene: Scene | undefined,
  messages: ChatMessage[],
) {
  for (const conflict of diagramConflicts(scene, messages)) {
    const question = `Your whiteboard shows ${conflict.drawn}, while your explanation uses ${conflict.spoken}. Which reflects your intended design?`;
    if (
      !messages.some(
        (m) => m.role === "assistant" && m.content.includes(question),
      )
    )
      return question;
  }
  return undefined;
}

export function whiteboardVisibilityReply(
  scene: Scene | undefined,
  text: string,
) {
  if (
    !/\b(?:can|could|do) you (?:see|read|view) (?:my|the) (?:whiteboard|board|drawing|diagram)\b/iu.test(
      text,
    )
  )
    return;
  const graph = sceneToGraph(scene);
  return graph.components.length
    ? `Your current whiteboard contains ${graph.components.map((n) => n.label).join(", ")}. Which part would you like to walk through?`
    : "Your current whiteboard has no labeled components yet. Please add and label your first component.";
}

/** Changes are compared by stable element ID; never call an initial snapshot a new addition. */
export function addedComponentQuestion(
  scene: Scene | undefined,
  previous: Scene | undefined,
  messages: ChatMessage[],
) {
  if (!previous) return;
  const old = new Set(sceneToGraph(previous).components.map((node) => node.id));
  for (const node of sceneToGraph(scene).components.filter(
    (node) => !old.has(node.id) && !/^unlabeled\b/iu.test(node.label),
  )) {
    const question = `How does ${JSON.stringify(node.label.slice(0, 120))} participate in your request or data path?`;
    if (
      !messages.some(
        (m) => m.role === "assistant" && m.content.includes(question),
      )
    )
      return question;
  }
}
