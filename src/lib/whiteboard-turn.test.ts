import { describe, expect, it, vi } from "vitest";
import { prepareWhiteboardTurn } from "@/lib/whiteboard-turn";
import { receiveChatTurn } from "@/lib/chat-stream";
import {
  PNG_FIXTURE,
  rectangleFixture,
  whiteboardFixture,
} from "@/lib/fixtures/whiteboard-test";

describe("prepareWhiteboardTurn", () => {
  it("attaches initial and visually changed drawings, but skips unchanged and empty drawings", async () => {
    const exportImage = vi.fn().mockResolvedValue(PNG_FIXTURE);
    const board = whiteboardFixture();
    const initial = await prepareWhiteboardTurn(board, undefined, exportImage);
    expect(initial.diagramImage).toBe(PNG_FIXTURE);
    const same = await prepareWhiteboardTurn(
      board,
      initial.fingerprint,
      exportImage,
    );
    expect(same.diagramImage).toBeUndefined();
    expect(exportImage).toHaveBeenCalledTimes(1);
    board.elements = [{ ...rectangleFixture(), x: 10 }];
    const moved = await prepareWhiteboardTurn(
      board,
      initial.fingerprint,
      exportImage,
    );
    expect(moved.diagramImage).toBe(PNG_FIXTURE);
    const empty = await prepareWhiteboardTurn(
      whiteboardFixture([]),
      moved.fingerprint,
      exportImage,
    );
    expect(empty.diagramImage).toBeUndefined();
    expect(empty.canCommitImage).toBe(true);
    expect(exportImage).toHaveBeenCalledTimes(2);
    const redraw = await prepareWhiteboardTurn(
      board,
      empty.fingerprint,
      exportImage,
    );
    expect(redraw.diagramImage).toBe(PNG_FIXTURE);
  });

  it("captures text and image inputs before drawing changes during async export", async () => {
    const board = whiteboardFixture();
    const exportImage = vi.fn(async (snapshot) => {
      expect(snapshot.elements[0].x).toBe(0);
      expect(snapshot.appState.viewBackgroundColor).toBe("#ffffff");
      return PNG_FIXTURE;
    });
    const pending = prepareWhiteboardTurn(board, undefined, exportImage);
    board.elements = [{ ...rectangleFixture(), x: 500 }];
    board.appState.viewBackgroundColor = "#000000";
    const sent = await pending;
    expect(sent.scene.elements[0].x).toBe(0);
  });

  it("keeps text working and retries images when exporting fails", async () => {
    const board = whiteboardFixture();
    const exportImage = vi
      .fn()
      .mockRejectedValueOnce(new Error("Canvas failed"))
      .mockResolvedValue(PNG_FIXTURE);
    const failed = await prepareWhiteboardTurn(board, undefined, exportImage);
    expect(failed.scene.elements).toHaveLength(1);
    expect(failed.diagramImage).toBeUndefined();
    expect(failed.imageWarning).toContain("couldn't be attached");
    expect(failed.canCommitImage).toBe(false);
    const retry = await prepareWhiteboardTurn(board, undefined, exportImage);
    expect(retry.diagramImage).toBe(PNG_FIXTURE);
    expect(retry.canCommitImage).toBe(true);
  });

  it("also falls back to text when image change detection is unavailable", async () => {
    vi.stubGlobal("crypto", {});
    try {
      const exportImage = vi.fn();
      const turn = await prepareWhiteboardTurn(
        whiteboardFixture(),
        undefined,
        exportImage,
      );
      expect(turn.scene.elements).toHaveLength(1);
      expect(turn.canCommitImage).toBe(false);
      expect(turn.imageWarning).toContain("Continuing with diagram text");
      expect(exportImage).not.toHaveBeenCalled();
      const empty = await prepareWhiteboardTurn(
        whiteboardFixture([]),
        undefined,
        exportImage,
      );
      expect(empty.canCommitImage).toBe(true);
      expect(empty.fingerprint).toBe("empty");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("retries images after an interrupted reply and stops resending only after completion", async () => {
    const board = whiteboardFixture();
    const exportImage = vi.fn().mockResolvedValue(PNG_FIXTURE);
    let previous: string | undefined;
    const sent = await prepareWhiteboardTurn(board, previous, exportImage);
    const broken = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error("Disconnected"));
      },
    });
    await expect(
      receiveChatTurn(
        broken,
        sent.scene,
        () => {},
        () => {
          previous = sent.fingerprint;
        },
      ),
    ).rejects.toThrow("Disconnected");
    expect(previous).toBeUndefined();
    const retry = await prepareWhiteboardTurn(board, previous, exportImage);
    expect(retry.diagramImage).toBe(PNG_FIXTURE);
    const complete = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("What breaks first?"));
        controller.close();
      },
    });
    await receiveChatTurn(
      complete,
      retry.scene,
      () => {},
      () => {
        if (retry.canCommitImage) previous = retry.fingerprint;
      },
    );
    expect(
      (await prepareWhiteboardTurn(board, previous, exportImage)).diagramImage,
    ).toBeUndefined();
  });
});
