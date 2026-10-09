import { describe, expect, it } from "vitest";
import { sceneComponentSchema, sceneTextSchema } from "@/lib/scene";
import { inferTextContainer } from "@/lib/scene-geometry";

const box = sceneComponentSchema.parse({
  id: "box",
  type: "rectangle",
  x: 0,
  y: 0,
  width: 100,
  height: 100,
});
const text = sceneTextSchema.parse({
  id: "label",
  type: "text",
  x: 30,
  y: 40,
  width: 40,
  height: 20,
  text: "backend",
});

describe("inferTextContainer", () => {
  it.each(["rectangle", "ellipse", "diamond"] as const)(
    "finds text entirely inside a %s",
    (type) => {
      expect(inferTextContainer(text, [{ ...box, type }])).toBe("box");
    },
  );

  it("does not capture outside text or text crossing a shape boundary", () => {
    expect(inferTextContainer({ ...text, x: 150 }, [box])).toBeUndefined();
    expect(inferTextContainer({ ...text, x: 80 }, [box])).toBeUndefined();
    expect(
      inferTextContainer({ ...text, x: 80, y: 0 }, [
        { ...box, type: "ellipse" },
      ]),
    ).toBeUndefined();
  });

  it("does not guess between overlapping containers", () => {
    expect(
      inferTextContainer(text, [box, { ...box, id: "second" }]),
    ).toBeUndefined();
  });

  it("accounts for rotated text and rotated shapes", () => {
    const rotatedBox = { ...box, width: 200, angle: Math.PI / 2 };
    expect(
      inferTextContainer({ ...text, x: 80, y: -30, width: 40, height: 20 }, [
        rotatedBox,
      ]),
    ).toBe("box");
    expect(
      inferTextContainer(
        { ...text, x: 90, y: 20, width: 20, height: 60, angle: Math.PI / 2 },
        [rotatedBox],
      ),
    ).toBe("box");
  });

  it("preserves existing bindings, ignores deleted elements, and rejects blank text", () => {
    expect(
      inferTextContainer({ ...text, containerId: "other" }, [box]),
    ).toBeUndefined();
    expect(
      inferTextContainer({ ...text, isDeleted: true }, [box]),
    ).toBeUndefined();
    expect(
      inferTextContainer(text, [{ ...box, isDeleted: true }]),
    ).toBeUndefined();
    expect(inferTextContainer({ ...text, text: " " }, [box])).toBeUndefined();
  });

  it("keeps text in a different frame from labeling the component", () => {
    expect(
      inferTextContainer({ ...text, frameId: "frame-a" }, [
        { ...box, frameId: "frame-b" },
      ]),
    ).toBeUndefined();
  });
});
