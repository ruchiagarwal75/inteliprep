import { describe, expect, it } from "vitest";
import unboundLabel from "@/lib/fixtures/unbound-label.json";
import { sceneSchema } from "@/lib/scene";
import { sceneToText } from "@/lib/scene-to-text";

describe("sceneToText positional labels", () => {
  it("names both rectangles when the second label is visually inside its box but unbound", () => {
    const text = sceneToText(sceneSchema.parse(unboundLabel));
    expect(text).toContain('- "user" ["user"]');
    expect(text).toContain('- "backend" ["backend"]');
    expect(text).toContain('"user" ["user"] -> "backend" ["backend"]');
    expect(text).not.toContain("unlabeled rectangle");
    expect(text).toContain("label inferred from position");
    expect(text).toContain("Notes:\n- none");
  });

  it("keeps unrelated notes outside the boxes as notes", () => {
    const scene = sceneSchema.parse(unboundLabel);
    const updated = {
      elements: scene.elements.map((element) =>
        element.id === "backend-label" ? { ...element, y: 200 } : element,
      ),
    };
    const text = sceneToText(updated);
    expect(text).toContain('"unlabeled rectangle" ["backend"]');
    expect(text).toContain('Notes:\n- "backend"');
  });

  it("preserves explicit labels and does not turn interior annotations into a new name", () => {
    const scene = sceneSchema.parse({
      elements: [
        ...unboundLabel.elements,
        {
          id: "backend-bound-label",
          type: "text",
          x: 280,
          y: 50,
          width: 80,
          height: 20,
          text: "API",
          containerId: "backend",
        },
      ],
    });
    const text = sceneToText(scene);
    expect(text).toContain('- "API" ["backend"]');
    expect(text).toContain('Notes:\n- "backend"');
    expect(text).not.toContain("label inferred from position");
  });

  it("retains ambiguous text inside overlapping boxes as a note", () => {
    const scene = sceneSchema.parse({
      elements: [
        ...unboundLabel.elements,
        {
          id: "overlapping",
          type: "rectangle",
          x: 250,
          y: 0,
          width: 140,
          height: 100,
        },
      ],
    });
    expect(sceneToText(scene)).toContain('Notes:\n- "backend"');
    expect(sceneToText(scene)).not.toContain('"backend" ["backend"]');
  });

  it("ignores a deleted unbound label", () => {
    const scene = sceneSchema.parse(unboundLabel);
    const updated = {
      elements: scene.elements.map((element) =>
        element.id === "backend-label"
          ? { ...element, isDeleted: true }
          : element,
      ),
    };
    expect(sceneToText(updated)).toContain('"unlabeled rectangle" ["backend"]');
    expect(sceneToText(updated)).toContain("Notes:\n- none");
  });
});
