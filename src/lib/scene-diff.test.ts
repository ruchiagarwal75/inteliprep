import { describe, expect, it } from "vitest";
import basicScene from "@/lib/fixtures/basic-system.json";
import cacheElements from "@/lib/fixtures/cache-elements.json";
import unboundLabel from "@/lib/fixtures/unbound-label.json";
import { sceneSchema } from "@/lib/scene";
import { sceneToGraph } from "@/lib/scene-graph";
import { diffSceneGraphs } from "@/lib/scene-diff";

const scene = sceneSchema.parse(basicScene);
const previous = sceneToGraph(scene);
const withCache = sceneSchema.parse({
  elements: [...basicScene.elements, ...cacheElements],
});

describe("diffSceneGraphs", () => {
  it("marks an initial scene without claiming every existing component is newly added", () => {
    expect(diffSceneGraphs(previous)).toBe(
      "Initial diagram: no previous completed turn to compare.",
    );
    expect(diffSceneGraphs(previous, sceneToGraph())).toContain(
      "Initial diagram",
    );
  });
  it("does not treat a missing current scene as a cleared canvas", () => {
    expect(diffSceneGraphs(sceneToGraph(), previous)).toContain("unavailable");
  });
  it("ignores unchanged scenes, layer ordering, and layout-only movement", () => {
    expect(diffSceneGraphs(previous, previous)).toBe("No diagram changes.");
    expect(
      diffSceneGraphs(
        sceneToGraph({ elements: [...scene.elements].reverse() }),
        previous,
      ),
    ).toBe("No diagram changes.");
    const moved = {
      elements: scene.elements.map((element) => ({
        ...element,
        x: element.x + 1_000,
      })),
    };
    expect(diffSceneGraphs(sceneToGraph(moved), previous)).toBe(
      "No diagram changes.",
    );
  });
  it("reports added components and connections using extracted labels", () => {
    const diff = diffSceneGraphs(sceneToGraph(withCache), previous);
    expect(diff).toContain('Added component: "Cache" ["cache"]');
    expect(diff).toContain(
      'Added connection: "API" ["api"] -> "Cache" ["cache"]',
    );
  });
  it("identifies renames by component ID without reporting unchanged connections as rewired", () => {
    const renamed = {
      elements: scene.elements.map((element) =>
        element.id === "api-label" && element.type === "text"
          ? { ...element, text: "backend" }
          : element,
      ),
    };
    const diff = diffSceneGraphs(sceneToGraph(renamed), previous);
    expect(diff).toContain('Renamed component: "API" -> "backend" ["api"]');
    expect(diff).not.toContain("Changed connection");
    expect(diff).not.toContain("Added component");
  });
  it("detects changed connection targets and direction", () => {
    const rewired = {
      elements: withCache.elements.map((element) =>
        element.id === "api-database" && element.type === "arrow"
          ? { ...element, endBinding: { elementId: "cache" } }
          : element,
      ),
    };
    expect(
      diffSceneGraphs(sceneToGraph(rewired), sceneToGraph(withCache)),
    ).toContain(
      'Changed connection: "API" ["api"] -> "Database" ["database"] => "API" ["api"] -> "Cache" ["cache"]',
    );
    const reversed = {
      elements: scene.elements.map((element) =>
        element.id === "client-api" && element.type === "arrow"
          ? { ...element, startArrowhead: "arrow" as const, endArrowhead: null }
          : element,
      ),
    };
    expect(diffSceneGraphs(sceneToGraph(reversed), previous)).toContain(
      "Changed connection:",
    );
  });
  it("ignores endpoint ordering changes that preserve the same flow", () => {
    const equivalent = {
      elements: scene.elements.map((element) =>
        element.id === "client-api" && element.type === "arrow"
          ? {
              ...element,
              startBinding: element.endBinding,
              endBinding: element.startBinding,
              startArrowhead: "arrow" as const,
              endArrowhead: null,
            }
          : element,
      ),
    };
    expect(diffSceneGraphs(sceneToGraph(equivalent), previous)).toBe(
      "No diagram changes.",
    );
  });
  it("reports removed components and connections, including clearing the canvas", () => {
    const diff = diffSceneGraphs(sceneToGraph({ elements: [] }), previous);
    expect(diff).toContain("Whiteboard cleared.");
    expect(diff).toContain('Removed component: "Database" ["database"]');
    expect(diff).toContain(
      'Removed connection: "API" ["api"] -> "Database" ["database"]',
    );
    expect(
      diffSceneGraphs(
        sceneToGraph({ elements: [] }),
        sceneToGraph({ elements: [] }),
      ),
    ).toBe("No diagram changes.");
  });
  it("reports the semantic effect of deleting a bound target while leaving an arrow", () => {
    const deleted = {
      elements: scene.elements.map((element) =>
        ["database", "database-label"].includes(element.id)
          ? { ...element, isDeleted: true }
          : element,
      ),
    };
    const diff = diffSceneGraphs(sceneToGraph(deleted), previous);
    expect(diff).toContain('Removed component: "Database"');
    expect(diff).toContain('=> "API" ["api"] -> [unresolved endpoint]');
  });
  it("uses positional label inference consistently for renames", () => {
    const before = sceneSchema.parse(unboundLabel);
    const after = {
      elements: before.elements.map((element) =>
        element.id === "backend-label" && element.type === "text"
          ? { ...element, text: "API" }
          : element,
      ),
    };
    expect(
      diffSceneGraphs(sceneToGraph(after), sceneToGraph(before)),
    ).toContain('Renamed component: "backend" -> "API" ["backend"]');
  });
});
