import { describe, expect, it } from "vitest";
import basicScene from "@/lib/fixtures/basic-system.json";
import { sceneSchema } from "@/lib/scene";
import { sceneToText } from "@/lib/scene-to-text";

const scene = sceneSchema.parse(basicScene);

describe("sceneToText", () => {
  it("describes labeled shapes, bound arrows, arrow labels, and notes", () => {
    expect(sceneToText(scene)).toBe(`Components:
- "Client" ["client"]
- "API" ["api"]
- "Database" ["database"]

Connections:
- "Client" ["client"] -> "API" ["api"] (label: "HTTPS")
- "API" ["api"] -> "Database" ["database"]

Notes:
- "Target: 10,000 requests/second"`);
  });

  it("distinguishes a missing scene from an empty or cleared canvas", () => {
    expect(sceneToText()).toContain("no scene was provided");
    expect(sceneToText({ elements: [] })).toContain("empty");
    expect(
      sceneToText({
        elements: scene.elements.map((element) => ({
          ...element,
          isDeleted: true,
        })),
      }),
    ).toContain("empty");
  });

  it("ignores deleted labels and describes the remaining unlabeled shape", () => {
    const updated = {
      elements: scene.elements.map((element) =>
        element.id === "api-label" ? { ...element, isDeleted: true } : element,
      ),
    };
    expect(sceneToText(updated)).toContain('"unlabeled rectangle" ["api"]');
    expect(sceneToText(updated)).not.toContain('"API"');
  });

  it("does not reconnect an arrow to a different shape when its bound target is deleted", () => {
    const updated = {
      elements: scene.elements.map((element) =>
        ["database", "database-label"].includes(element.id)
          ? { ...element, isDeleted: true }
          : element,
      ),
    };
    expect(sceneToText(updated)).toContain(
      '"API" ["api"] -> [unresolved endpoint]',
    );
  });

  it("distinguishes duplicate component labels by element IDs", () => {
    const updated = {
      elements: scene.elements.map((element) =>
        element.type === "text" && element.containerId
          ? { ...element, text: "Service" }
          : element,
      ),
    };
    expect(sceneToText(updated)).toContain(
      '"Service" ["client"] -> "Service" ["api"]',
    );
  });

  it.each([
    ["arrow", null, "<-"],
    ["arrow", "arrow", "<->"],
    [null, null, "--"],
  ] as const)(
    "preserves arrow direction for heads %s/%s",
    (startArrowhead, endArrowhead, direction) => {
      const updated = {
        elements: scene.elements.map((element) =>
          element.id === "client-api" && element.type === "arrow"
            ? { ...element, startArrowhead, endArrowhead }
            : element,
        ),
      };
      expect(sceneToText(updated)).toContain(
        `"Client" ["client"] ${direction} "API" ["api"]`,
      );
    },
  );

  it("marks proximity inferences and unresolved loose arrows", () => {
    const updated = {
      elements: scene.elements.map((element) =>
        element.type === "arrow"
          ? { ...element, startBinding: null, endBinding: null }
          : element,
      ),
    };
    expect(sceneToText(updated)).toContain("endpoint inferred from proximity");
    const far = {
      elements: updated.elements.map((element) =>
        element.type === "arrow" ? { ...element, y: 1_000 } : element,
      ),
    };
    expect(sceneToText(far)).toContain(
      "[unresolved endpoint] -> [unresolved endpoint]",
    );
  });
});
