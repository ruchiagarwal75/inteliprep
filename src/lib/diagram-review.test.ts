import { describe, expect, it } from "vitest";
import { diagramReviewQuestion } from "@/lib/diagram-review";
import { sceneSchema, type Scene } from "@/lib/scene";
import basicScene from "@/lib/fixtures/basic-system.json";

function drawing(): Scene {
  return sceneSchema.parse({
    elements: [
      ...basicScene.elements,
      {
        id: "app2",
        type: "rectangle",
        x: 200,
        y: 300,
        width: 100,
        height: 100,
      },
      {
        id: "app2-label",
        type: "text",
        x: 210,
        y: 340,
        width: 80,
        height: 20,
        containerId: "app2",
        text: "App 2",
      },
    ],
  });
}
describe("focused diagram review", () => {
  it("spots a second app without a database path and doesn't repeat the same probe", () => {
    const question = diagramReviewQuestion(drawing(), []);
    expect(question).toContain('"App 2"');
    expect(question).toContain("database");
    expect(
      diagramReviewQuestion(drawing(), [
        { role: "assistant", content: question ?? "" },
      ]),
    ).toBeUndefined();
  });
  it("accepts a directed data path, including an intermediate service and cycles", () => {
    const scene = drawing();
    const arrow = scene.elements.find(
      (element) => element.type === "arrow" && element.id === "api-database",
    );
    if (!arrow || arrow.type !== "arrow") throw new Error("Missing arrow");
    scene.elements.push({
      ...arrow,
      id: "app2-api",
      startBinding: { elementId: "app2" },
      endBinding: { elementId: "api" },
    });
    scene.elements.push({
      ...arrow,
      id: "api-app2",
      startBinding: { elementId: "api" },
      endBinding: { elementId: "app2" },
    });
    expect(diagramReviewQuestion(scene, [])).toBeUndefined();
  });
  it("does not assume a reversed arrow permits app reads and writes", () => {
    const scene = drawing();
    const arrow = scene.elements.find((element) => element.type === "arrow");
    if (!arrow || arrow.type !== "arrow") throw new Error("Missing arrow");
    scene.elements.push({
      ...arrow,
      id: "database-app2",
      startBinding: { elementId: "database" },
      endBinding: { elementId: "app2" },
    });
    expect(diagramReviewQuestion(scene, [])).toContain('"App 2"');
  });
  it("asks where a mentioned cache/CDN belongs, then moves on after asking", () => {
    const scene = sceneSchema.parse(basicScene);
    const messages = [
      {
        role: "user" as const,
        content: "I use a cache and CDN to reduce traffic.",
      },
    ];
    const cache = diagramReviewQuestion(scene, messages);
    expect(cache).toContain("cache");
    const cdn = diagramReviewQuestion(scene, [
      ...messages,
      { role: "assistant", content: cache ?? "" },
    ]);
    expect(cdn).toContain("CDN");
  });
  it("uses uncertain wording for freehand drawings and doesn't assert a missing path", () => {
    const scene = drawing();
    scene.elements.push(
      sceneSchema.parse({
        elements: [
          {
            id: "stroke",
            type: "freedraw",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
          },
        ],
      }).elements[0],
    );
    expect(diagramReviewQuestion(scene, [])).toBeUndefined();
    expect(
      diagramReviewQuestion(scene, [
        { role: "user", content: "I use a cache." },
      ]),
    ).toContain("Could you point out");
  });
  it("doesn't invent missing components on empty canvases or when they are already labeled", () => {
    expect(
      diagramReviewQuestion(undefined, [
        { role: "user", content: "I use a cache." },
      ]),
    ).toBeUndefined();
    const scene = sceneSchema.parse(basicScene);
    scene.elements.push(
      sceneSchema.parse({
        elements: [
          {
            id: "cache",
            type: "text",
            text: "Cache",
            x: 0,
            y: 0,
            width: 20,
            height: 20,
          },
        ],
      }).elements[0],
    );
    expect(
      diagramReviewQuestion(scene, [
        { role: "user", content: "I use a cache." },
      ]),
    ).toBeUndefined();
  });
});
