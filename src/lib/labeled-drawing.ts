import { sceneLabel } from "@/lib/scene";
import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";

/** Inspect native saves without applying the stricter, bounded model-request schema. */
export function hasLabeledShape(elements: WhiteboardScene["elements"]) {
  const live = elements.filter((element) => !element.isDeleted);
  return live.some(
    (shape) =>
      ["rectangle", "ellipse", "diamond"].includes(shape.type) &&
      live.some((label) => {
        if (label.type !== "text" || !sceneLabel(label)) return false;
        if (label.containerId) return label.containerId === shape.id;
        const x = label.x + label.width / 2;
        const y = label.y + label.height / 2;
        return (
          x >= shape.x &&
          x <= shape.x + shape.width &&
          y >= shape.y &&
          y <= shape.y + shape.height
        );
      }),
  );
}
