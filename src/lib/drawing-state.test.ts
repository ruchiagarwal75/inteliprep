import { describe, expect, it } from "vitest";
import { hasSketch } from "@/lib/drawing-state";

describe("hasSketch", () => {
  it.each(["rectangle", "arrow", "freedraw", "image"])(
    "recognizes live %s elements",
    (type) => {
      expect(hasSketch([{ type }])).toBe(true);
    },
  );
  it("ignores absent elements, text notes, selection boxes, and deleted sketches", () => {
    expect(hasSketch()).toBe(false);
    expect(
      hasSketch([
        { type: "text" },
        { type: "selection" },
        { type: "rectangle", isDeleted: true },
      ]),
    ).toBe(false);
  });
});
