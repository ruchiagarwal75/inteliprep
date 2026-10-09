import { describe, expect, it } from "vitest";
import basicScene from "@/lib/fixtures/basic-system.json";
import {
  isSceneComponent,
  MAX_LABEL_LENGTH,
  MAX_SCENE_ELEMENTS,
  sceneElementSchema,
  sceneSchema,
} from "@/lib/scene";

const rectangle = {
  id: "box",
  type: "rectangle",
  x: 0,
  y: 0,
  width: 100,
  height: 100,
};

describe("sceneSchema", () => {
  it("accepts actual drawing fields and strips unused styling and file data", () => {
    const scene = sceneSchema.parse(basicScene);
    expect(scene.elements).toHaveLength(10);
    expect(scene).not.toHaveProperty("files");
    expect(scene.elements[0]).not.toHaveProperty("strokeColor");
    expect(scene.elements[0]).toMatchObject({
      angle: 0,
      isDeleted: false,
      frameId: null,
      groupIds: [],
    });
  });

  it("accepts an empty canvas", () => {
    expect(sceneSchema.parse({ elements: [] })).toEqual({ elements: [] });
  });

  it.each([
    null,
    {},
    { elements: "bad" },
    { elements: [{ type: "rectangle" }] },
  ])("rejects a malformed scene: %j", (scene) => {
    expect(sceneSchema.safeParse(scene).success).toBe(false);
  });

  it.each([NaN, Infinity, "0", -1_000_001])(
    "rejects invalid coordinates: %s",
    (x) => {
      expect(
        sceneSchema.safeParse({ elements: [{ ...rectangle, x }] }).success,
      ).toBe(false);
    },
  );

  it("rejects duplicate element IDs", () => {
    expect(
      sceneSchema.safeParse({ elements: [rectangle, rectangle] }).success,
    ).toBe(false);
  });

  it("limits the number of elements", () => {
    const elements = Array.from({ length: MAX_SCENE_ELEMENTS + 1 }, (_, i) => ({
      ...rectangle,
      id: `box-${i}`,
    }));
    expect(sceneSchema.safeParse({ elements }).success).toBe(false);
  });

  it("limits label lengths", () => {
    const text = {
      ...rectangle,
      type: "text",
      text: "x".repeat(MAX_LABEL_LENGTH + 1),
    };
    expect(sceneSchema.safeParse({ elements: [text] }).success).toBe(false);
  });

  it("validates arrow geometry and bindings", () => {
    const arrow = {
      ...rectangle,
      type: "arrow",
      points: [
        [0, 0],
        [100, 0],
      ],
    };
    expect(sceneSchema.safeParse({ elements: [arrow] }).success).toBe(true);
    expect(
      sceneSchema.safeParse({ elements: [{ ...arrow, points: [[0, 0]] }] })
        .success,
    ).toBe(false);
    expect(
      sceneSchema.safeParse({
        elements: [{ ...arrow, startBinding: { elementId: 7 } }],
      }).success,
    ).toBe(false);
  });

  it.each(["rectangle", "ellipse", "diamond", "image", "text", "frame"])(
    "identifies whether %s is a component",
    (type) => {
      const element = sceneElementSchema.parse({
        ...rectangle,
        type,
        text: "API",
      });
      expect(isSceneComponent(element)).toBe(
        ["rectangle", "ellipse", "diamond"].includes(type),
      );
    },
  );
});
