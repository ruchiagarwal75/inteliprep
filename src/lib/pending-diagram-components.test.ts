import { expect, it } from "vitest";
import { pendingDiagramComponents } from "@/lib/pending-diagram-components";
import { sceneSchema } from "@/lib/scene";
it("keeps a named addition through quiet turns and removes components no longer present", () => {
  const old = sceneSchema.parse({
    elements: [
      { id: "api", type: "rectangle", x: 0, y: 0, width: 100, height: 50 },
      {
        id: "a",
        type: "text",
        x: 5,
        y: 5,
        width: 80,
        height: 20,
        text: "API",
        containerId: "api",
      },
    ],
  });
  const scene = sceneSchema.parse({
    elements: [
      ...old.elements,
      { id: "zk", type: "rectangle", x: 200, y: 0, width: 100, height: 50 },
      {
        id: "z",
        type: "text",
        x: 205,
        y: 5,
        width: 80,
        height: 20,
        text: "ID allocator (ZooKeeper)",
        containerId: "zk",
      },
    ],
  });
  const first = pendingDiagramComponents([], scene, old);
  expect(first).toEqual(["ID allocator (ZooKeeper)"]);
  expect(pendingDiagramComponents(first, scene, scene)).toEqual(first);
  expect(pendingDiagramComponents(first, old, old)).toEqual([]);
});
