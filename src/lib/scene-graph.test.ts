import { describe, expect, it } from "vitest";
import basicScene from "@/lib/fixtures/basic-system.json";
import unboundLabel from "@/lib/fixtures/unbound-label.json";
import { sceneSchema } from "@/lib/scene";
import { sceneToGraph } from "@/lib/scene-graph";
import { graphToText } from "@/lib/scene-to-text";

describe("sceneToGraph", () => {
  it("extracts identified components, connections, and notes without layout fields", () => {
    const graph = sceneToGraph(sceneSchema.parse(basicScene));
    expect(graph.components.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "client", label: "Client" },
      { id: "api", label: "API" },
      { id: "database", label: "Database" },
    ]);
    expect(graph.components[0]).not.toHaveProperty("x");
    expect(graph.connections[0]).toMatchObject({
      id: "client-api",
      start: { id: "client" },
      end: { id: "api" },
      label: "HTTPS",
      direction: "->",
    });
    expect(graph.notes[0]).toMatchObject({
      id: "traffic",
      text: "Target: 10,000 requests/second",
    });
    expect(graphToText(graph)).toContain(
      '"API" ["api"] -> "Database" ["database"]',
    );
  });

  it("retains the fix for unbound labels and records inference separately from names", () => {
    const graph = sceneToGraph(sceneSchema.parse(unboundLabel));
    expect(graph.components[1]).toMatchObject({
      id: "backend",
      label: "backend",
      labelInferred: true,
    });
    expect(graph.connections[0].end).toEqual({
      id: "backend",
      label: "backend",
    });
    expect(graph.notes).toEqual([]);
  });

  it("distinguishes missing, empty, and deleted-only scenes", () => {
    expect(sceneToGraph().status).toBe("missing");
    expect(sceneToGraph({ elements: [] }).status).toBe("empty");
    const scene = sceneSchema.parse(basicScene);
    expect(
      sceneToGraph({
        elements: scene.elements.map((element) => ({
          ...element,
          isDeleted: true,
        })),
      }).status,
    ).toBe("empty");
  });

  it("combines labels deterministically when scene ordering changes", () => {
    const scene = sceneSchema.parse({
      elements: [
        ...basicScene.elements,
        {
          id: "api-label-2",
          type: "text",
          x: 210,
          y: 65,
          width: 80,
          height: 20,
          text: "v2",
          containerId: "api",
        },
      ],
    });
    const forward = sceneToGraph(scene).components.find(
      (component) => component.id === "api",
    );
    const reverse = sceneToGraph({
      elements: [...scene.elements].reverse(),
    }).components.find((component) => component.id === "api");
    expect(forward?.label).toBe("API / v2");
    expect(reverse?.label).toBe(forward?.label);
  });
});
