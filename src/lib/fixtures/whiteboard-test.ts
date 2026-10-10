import type { ExcalidrawRectangleElement } from "@excalidraw/excalidraw/element/types";
import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";

export const PNG_FIXTURE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/e2sAAAAASUVORK5CYII=";

export function rectangleFixture(): ExcalidrawRectangleElement {
  return {
    type: "rectangle",
    id: "api",
    x: 0,
    y: 0,
    width: 100,
    height: 60,
    angle: 0 as ExcalidrawRectangleElement["angle"],
    strokeColor: "#000000",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roundness: null,
    roughness: 1,
    opacity: 100,
    seed: 1,
    version: 1,
    versionNonce: 1,
    index: null,
    isDeleted: false,
    groupIds: [],
    frameId: null,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
  };
}

export function whiteboardFixture(
  elements: WhiteboardScene["elements"] = [rectangleFixture()],
): WhiteboardScene {
  return {
    elements,
    appState: { viewBackgroundColor: "#ffffff" },
    files: {},
  };
}
