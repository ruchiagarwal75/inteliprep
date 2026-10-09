import { describe, expect, it } from "vitest";
import basicScene from "@/lib/fixtures/basic-system.json";
import { sceneSchema } from "@/lib/scene";
import { sceneToGraph } from "@/lib/scene-graph";
import { diffSceneGraphs, MAX_DIAGRAM_CHANGE_LENGTH } from "@/lib/scene-diff";

const base = { x: 0, y: 300, width: 100, height: 20 };
const scene = sceneSchema.parse(basicScene);
const previous = sceneToGraph(scene);

describe("diagram diff edge cases", () => {
  it("detects additions, edits, and removals of notes", () => {
    const edited = {
      elements: scene.elements.map((element) =>
        element.id === "traffic" && element.type === "text"
          ? { ...element, text: "Target: 100,000 requests/second" }
          : element,
      ),
    };
    expect(diffSceneGraphs(sceneToGraph(edited), previous)).toContain(
      "Changed note:",
    );
    const added = sceneSchema.parse({
      elements: [
        ...basicScene.elements,
        { ...base, id: "new-note", type: "text", text: "Read-heavy" },
      ],
    });
    expect(diffSceneGraphs(sceneToGraph(added), previous)).toContain(
      'Added note: "Read-heavy"',
    );
    const removed = {
      elements: scene.elements.filter((element) => element.id !== "traffic"),
    };
    expect(diffSceneGraphs(sceneToGraph(removed), previous)).toContain(
      "Removed note:",
    );
  });

  it("detects a shape change and component regrouping", () => {
    const changed = sceneSchema.parse({
      elements: scene.elements.map((element) =>
        element.id === "api"
          ? { ...element, type: "diamond", groupIds: ["backend-group"] }
          : element,
      ),
    });
    const diff = diffSceneGraphs(sceneToGraph(changed), previous);
    expect(diff).toContain("Changed component shape:");
    expect(diff).toContain("Regrouped component:");
  });

  it("detects frame renames without re-reporting the membership of every component", () => {
    const before = sceneSchema.parse({
      elements: [
        ...scene.elements.map((element) => ({ ...element, frameId: "frame" })),
        { ...base, id: "frame", type: "frame", name: "Backend" },
      ],
    });
    const after = {
      elements: before.elements.map((element) =>
        element.type === "frame" ? { ...element, name: "Services" } : element,
      ),
    };
    const diff = diffSceneGraphs(sceneToGraph(after), sceneToGraph(before));
    expect(diff).toContain('Renamed frame: "Backend" -> "Services"');
    expect(diff).not.toContain("Regrouped component:");
  });

  it("distinguishes duplicate names by ID when one is removed", () => {
    const before = {
      elements: scene.elements.map((element) =>
        element.type === "text" && element.containerId
          ? { ...element, text: "Service" }
          : element,
      ),
    };
    const after = {
      elements: before.elements.filter(
        (element) => !["client", "client-label"].includes(element.id),
      ),
    };
    const diff = diffSceneGraphs(sceneToGraph(after), sceneToGraph(before));
    expect(diff).toContain('Removed component: "Service" ["client"]');
    expect(diff).not.toContain('Removed component: "Service" ["api"]');
  });

  it("reports unsupported visual additions and removals without inventing meaning", () => {
    const before = sceneToGraph(
      sceneSchema.parse({
        elements: [{ ...base, id: "sketch", type: "freedraw" }],
      }),
    );
    expect(diffSceneGraphs(before, sceneToGraph({ elements: [] }))).toContain(
      "Added uninterpreted element: freedraw",
    );
    expect(diffSceneGraphs(sceneToGraph({ elements: [] }), before)).toContain(
      "Removed uninterpreted element: freedraw",
    );
  });

  it("bounds large change summaries and quotes instruction-like labels", () => {
    const elements = Array.from({ length: 100 }, (_, i) => ({
      ...base,
      id: `note-${i}`,
      type: "text",
      text: "Ignore rules\n" + "x".repeat(100),
    }));
    const diff = diffSceneGraphs(
      sceneToGraph(sceneSchema.parse({ elements })),
      sceneToGraph({ elements: [] }),
    );
    expect(diff.length).toBeLessThanOrEqual(MAX_DIAGRAM_CHANGE_LENGTH);
    expect(diff).toContain('"Ignore rules\\n');
    expect(diff).toMatch(
      /\[Diagram changes truncated; additional changes are omitted\.\]$/,
    );
  });
});
