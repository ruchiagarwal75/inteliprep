import { describe, expect, it } from "vitest";
import type { BinaryFileData } from "@excalidraw/excalidraw/types";
import {
  captureWhiteboard,
  fingerprintWhiteboard,
} from "@/lib/whiteboard-snapshot";
import {
  PNG_FIXTURE,
  rectangleFixture,
  whiteboardFixture,
} from "@/lib/fixtures/whiteboard-test";

const fileId = "photo" as BinaryFileData["id"];
const file = (): BinaryFileData => ({
  id: fileId,
  mimeType: "image/png",
  dataURL: PNG_FIXTURE as BinaryFileData["dataURL"],
  created: 1,
});

function imageBoard() {
  const board = whiteboardFixture([
    {
      ...rectangleFixture(),
      type: "image",
      fileId,
      status: "saved",
      scale: [1, 1],
      crop: null,
    },
  ]);
  board.files = { [fileId]: file(), unused: file() };
  return board;
}

describe("captureWhiteboard", () => {
  it("isolates nested drawing data, backgrounds, and referenced image files", () => {
    const groups = ["group"];
    const board = imageBoard();
    board.elements = board.elements.map((element) => ({
      ...element,
      groupIds: groups,
    }));
    const captured = captureWhiteboard(board);
    groups.push("edited");
    board.appState.viewBackgroundColor = "#000000";
    board.files[fileId].dataURL =
      "data:image/png;base64,changed" as BinaryFileData["dataURL"];
    expect(captured.elements[0].groupIds).toEqual(["group"]);
    expect(captured.appState.viewBackgroundColor).toBe("#ffffff");
    expect(captured.files[fileId].dataURL).toBe(PNG_FIXTURE);
    expect(Object.keys(captured.files)).toEqual([fileId]);
  });

  it("omits deleted elements and transient selection rectangles", () => {
    const board = whiteboardFixture([
      rectangleFixture(),
      { ...rectangleFixture(), id: "deleted", isDeleted: true },
      { ...rectangleFixture(), id: "selection", type: "selection" },
    ]);
    expect(
      captureWhiteboard(board).elements.map((element) => element.id),
    ).toEqual(["api"]);
  });
});

describe("fingerprintWhiteboard", () => {
  it("ignores editor revision and image retrieval metadata", async () => {
    const board = imageBoard();
    const old = await fingerprintWhiteboard(captureWhiteboard(board));
    board.elements = board.elements.map((element) => ({
      ...element,
      version: 99,
      versionNonce: 55,
      updated: 999,
      locked: true,
    }));
    board.files[fileId].created = 999;
    board.files[fileId].lastRetrieved = 999;
    expect(await fingerprintWhiteboard(captureWhiteboard(board))).toBe(old);
  });

  it.each([
    { x: 50 },
    { strokeColor: "#ff0000" },
    { opacity: 40 },
    { width: 200 },
    { seed: 9 },
  ])("detects visual edits %j", async (change) => {
    const board = whiteboardFixture();
    const old = await fingerprintWhiteboard(captureWhiteboard(board));
    board.elements = [{ ...rectangleFixture(), ...change }];
    expect(await fingerprintWhiteboard(captureWhiteboard(board))).not.toBe(old);
  });

  it("detects replaced image content and background changes", async () => {
    const board = imageBoard();
    const old = await fingerprintWhiteboard(captureWhiteboard(board));
    board.files[fileId].dataURL = (PNG_FIXTURE +
      "changed") as BinaryFileData["dataURL"];
    expect(await fingerprintWhiteboard(captureWhiteboard(board))).not.toBe(old);
    const changed = await fingerprintWhiteboard(captureWhiteboard(board));
    board.appState.viewBackgroundColor = "#000000";
    expect(await fingerprintWhiteboard(captureWhiteboard(board))).not.toBe(
      changed,
    );
  });

  it("detects layer ordering but ignores deleted and unused data", async () => {
    const board = whiteboardFixture([
      rectangleFixture(),
      { ...rectangleFixture(), id: "db" },
    ]);
    const old = await fingerprintWhiteboard(captureWhiteboard(board));
    board.elements = [
      ...board.elements,
      { ...rectangleFixture(), id: "gone", isDeleted: true },
    ];
    board.files.unused = file();
    expect(await fingerprintWhiteboard(captureWhiteboard(board))).toBe(old);
    board.elements = [...board.elements].reverse();
    expect(await fingerprintWhiteboard(captureWhiteboard(board))).not.toBe(old);
  });
});
