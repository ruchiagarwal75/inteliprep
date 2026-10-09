import { describe, expect, it } from "vitest";
import { sceneArrowSchema, sceneComponentSchema } from "@/lib/scene";
import { inferArrowEndpoint } from "@/lib/scene-geometry";

const box = sceneComponentSchema.parse({
  id: "box",
  type: "rectangle",
  x: 0,
  y: 0,
  width: 100,
  height: 100,
});
const arrow = sceneArrowSchema.parse({
  id: "arrow",
  type: "arrow",
  x: 105,
  y: 50,
  width: 95,
  height: 0,
  points: [
    [0, 0],
    [95, 0],
  ],
});

describe("inferArrowEndpoint", () => {
  it("uses a clearly nearby shape and leaves far endpoints unresolved", () => {
    expect(inferArrowEndpoint(arrow, "start", [box])).toBe("box");
    expect(inferArrowEndpoint(arrow, "end", [box])).toBeUndefined();
  });

  it("does not guess between equally close shapes", () => {
    const second = { ...box, id: "second", x: 110 };
    expect(inferArrowEndpoint(arrow, "start", [box, second])).toBeUndefined();
  });

  it("ignores deleted and zero-sized shapes", () => {
    expect(
      inferArrowEndpoint(arrow, "start", [{ ...box, isDeleted: true }]),
    ).toBeUndefined();
    expect(
      inferArrowEndpoint(arrow, "start", [{ ...box, width: 0 }]),
    ).toBeUndefined();
    expect(inferArrowEndpoint(arrow, "start", [])).toBeUndefined();
  });

  it.each(["ellipse", "diamond"] as const)(
    "uses the actual %s boundary rather than its bounding box",
    (type) => {
      const shape = { ...box, type };
      expect(inferArrowEndpoint(arrow, "start", [shape])).toBe("box");
      const corner = { ...arrow, x: 110, y: -10 };
      expect(inferArrowEndpoint(corner, "start", [shape])).toBeUndefined();
      expect(inferArrowEndpoint({ ...arrow, x: 50 }, "start", [shape])).toBe(
        "box",
      );
    },
  );

  it("accounts for a rotated shape", () => {
    const rotated = { ...box, width: 200, angle: Math.PI / 2 };
    expect(
      inferArrowEndpoint({ ...arrow, x: 100, y: -55 }, "start", [rotated]),
    ).toBe("box");
  });

  it("accounts for rotated arrow points", () => {
    const rotatedArrow = {
      ...arrow,
      x: 55,
      y: -45,
      width: 100,
      points: [
        [0, 0],
        [100, 0],
      ] as [number, number][],
      angle: Math.PI / 2,
    };
    expect(inferArrowEndpoint(rotatedArrow, "end", [box])).toBe("box");
  });

  it("uses the actual rotation center when local arrow points are negative", () => {
    const reversed = {
      ...arrow,
      x: 150,
      y: 50,
      points: [
        [0, 0],
        [-100, 0],
      ] as [number, number][],
      angle: Math.PI / 2,
    };
    expect(inferArrowEndpoint(reversed, "end", [box])).toBe("box");
  });
});
