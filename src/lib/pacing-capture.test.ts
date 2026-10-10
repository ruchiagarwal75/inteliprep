import { describe, expect, it } from "vitest";
import { drawingChanged } from "@/lib/pacing-capture";
import { sceneSchema } from "@/lib/scene";
import basicScene from "@/lib/fixtures/basic-system.json";

const scene = sceneSchema.parse(basicScene);
const empty = sceneSchema.parse({ elements: [] });

describe("pacing captures", () => {
  it("recognizes freehand and styling edits from visual fingerprints even when normalized text is unchanged", () => {
    expect(
      drawingChanged(
        { scene, fingerprint: "new-strokes" },
        { scene, fingerprint: "old-strokes" },
      ),
    ).toBe(true);
    expect(
      drawingChanged(
        { scene, fingerprint: "same" },
        { scene, fingerprint: "same" },
      ),
    ).toBe(false);
  });
  it("falls back to scene edits or clearing when a fingerprint is unavailable", () => {
    expect(drawingChanged({ scene }, { scene })).toBe(false);
    expect(
      drawingChanged({ scene }, { scene: empty, fingerprint: "empty" }),
    ).toBe(true);
    expect(drawingChanged({ scene: empty }, { scene })).toBe(true);
  });
  it("does not mistake the first captured drawing for an edit during review", () => {
    expect(drawingChanged({ scene, fingerprint: "first" })).toBe(false);
  });
});
