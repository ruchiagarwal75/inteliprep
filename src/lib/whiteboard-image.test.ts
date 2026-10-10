import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_DIAGRAM_IMAGE_BYTES,
  PNG_DATA_URL_PREFIX,
} from "@/lib/diagram-image";
import { PNG_FIXTURE, whiteboardFixture } from "@/lib/fixtures/whiteboard-test";

const mocks = vi.hoisted(() => ({ exportToBlob: vi.fn() }));
vi.mock("@excalidraw/excalidraw", () => mocks);
const { exportWhiteboardImage } = await import("@/lib/whiteboard-image");
const png = () =>
  new Blob(
    [Buffer.from(PNG_FIXTURE.slice(PNG_DATA_URL_PREFIX.length), "base64")],
    { type: "image/png" },
  );

beforeEach(() => {
  mocks.exportToBlob.mockReset();
  mocks.exportToBlob.mockResolvedValue(png());
});

describe("exportWhiteboardImage", () => {
  it("exports a bounded PNG with background and without embedded editor data", async () => {
    const board = whiteboardFixture();
    expect(await exportWhiteboardImage(board)).toBe(PNG_FIXTURE);
    expect(mocks.exportToBlob).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: board.elements,
        files: board.files,
        mimeType: "image/png",
        maxWidthOrHeight: 1280,
        appState: expect.objectContaining({
          exportBackground: true,
          exportEmbedScene: false,
          exportScale: 1,
        }),
      }),
    );
  });

  it("reduces oversized exports before attaching them", async () => {
    mocks.exportToBlob.mockResolvedValueOnce(
      new Blob([new Uint8Array(MAX_DIAGRAM_IMAGE_BYTES + 1)]),
    );
    expect(await exportWhiteboardImage(whiteboardFixture())).toBe(PNG_FIXTURE);
    expect(
      mocks.exportToBlob.mock.calls.map(([opts]) => opts.maxWidthOrHeight),
    ).toEqual([1280, 960]);
  });

  it("reports an oversized or failed export so chat can fall back to text", async () => {
    mocks.exportToBlob.mockResolvedValue(
      new Blob([new Uint8Array(MAX_DIAGRAM_IMAGE_BYTES + 1)]),
    );
    await expect(exportWhiteboardImage(whiteboardFixture())).rejects.toThrow(
      "too large",
    );
    expect(mocks.exportToBlob).toHaveBeenCalledTimes(4);
    mocks.exportToBlob.mockRejectedValue(new Error("Canvas failed"));
    await expect(exportWhiteboardImage(whiteboardFixture())).rejects.toThrow(
      "Canvas failed",
    );
  });
});
