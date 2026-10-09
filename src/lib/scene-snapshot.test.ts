import { describe, expect, it } from "vitest";
import basicScene from "@/lib/fixtures/basic-system.json";
import { sceneSchema } from "@/lib/scene";
import { captureScene } from "@/lib/scene-snapshot";

describe("captureScene", () => {
  it("isolates the sent scene from later drawing edits, including nested arrow data", () => {
    const draft = sceneSchema.parse(basicScene);
    const snapshot = captureScene(draft.elements);
    draft.elements[0].width = 999;
    draft.elements[0].groupIds.push("new-group");
    const arrow = draft.elements.find((element) => element.id === "client-api");
    if (!arrow || arrow.type !== "arrow" || !arrow.endBinding)
      throw new Error("Missing fixture arrow");
    arrow.points[1][0] = 999;
    arrow.endBinding.elementId = "different";
    expect(snapshot.elements[0].width).toBe(100);
    expect(snapshot.elements[0].groupIds).toEqual([]);
    expect(
      snapshot.elements.find((element) => element.id === "client-api"),
    ).toMatchObject({
      points: [
        [0, 0],
        [100, 0],
      ],
      endBinding: { elementId: "api" },
    });
  });
  it("rejects invalid drawing data with a readable error", () => {
    expect(() => captureScene([{ type: "rectangle" }])).toThrow(
      "Invalid whiteboard:",
    );
  });
});
