import { describe, expect, it } from "vitest";
import {
  savedInterviewSchema,
  savedInterviewSummary,
  updateSavedInterview,
} from "@/lib/saved-interview";
import { savedFixture } from "@/lib/fixtures/saved-interview-test";
import {
  rectangleFixture,
  whiteboardFixture,
} from "@/lib/fixtures/whiteboard-test";
import type {
  ExcalidrawFreeDrawElement,
  ExcalidrawImageElement,
} from "@excalidraw/excalidraw/element/types";
import type { BinaryFileData } from "@excalidraw/excalidraw/types";
import { PNG_FIXTURE } from "@/lib/fixtures/whiteboard-test";
import { captureScene } from "@/lib/scene-snapshot";
import { scorecardFixture } from "@/lib/fixtures/scorecard-test";
import type { NormalizedZoomValue } from "@excalidraw/excalidraw/types";

describe("browser session snapshots", () => {
  it("preserves drafts, grading failures and viewport, including across older-save defaults", () => {
    const saved = savedFixture();
    const updated = updateSavedInterview(
      saved,
      {
        draftText: "I would retry identifier collisions.",
        gradingError: "Temporary grading failure",
      },
      {
        ...saved.whiteboard,
        appState: {
          ...saved.whiteboard.appState,
          scrollX: 110,
          scrollY: -90,
          zoom: { value: 1.2 as NormalizedZoomValue },
        },
      },
    );
    expect(savedInterviewSchema.parse(updated).draftText).toBe(
      "I would retry identifier collisions.",
    );
    expect(
      savedInterviewSchema.parse(updated).whiteboard.appState.zoom?.value,
    ).toBe(1.2);
    expect(savedInterviewSummary(updated).gradingError).toBe(
      "Temporary grading failure",
    );
    expect(
      savedInterviewSchema.parse({ ...saved, draftText: undefined }).draftText,
    ).toBe("");
  });
  it("summarizes completed scorecards using actual scores and a bounded elapsed duration", () => {
    const saved = savedFixture();
    const scorecard = scorecardFixture();
    saved.hasEnded = true;
    saved.scorecard = scorecard;
    scorecard.session = {
      startedAt: saved.createdAt,
      elapsedSeconds: 240,
      allowedSeconds: 2700,
      limited: true,
      note: "Brief attempt",
    };
    expect(savedInterviewSummary(saved)).toMatchObject({
      signal: "yes",
      averageScore: 3,
      elapsedSeconds: 240,
      hasScorecard: true,
    });
    scorecard.areas[0].score = null;
    expect(savedInterviewSummary(saved).averageScore).toBe(3);
  });
  it("captures a started interview with its opening and opaque checkpoint", () => {
    const saved = savedFixture();
    expect(savedInterviewSchema.parse(saved)).toEqual(saved);
    expect(saved.id).toBe(saved.interview.sessionId);
    expect(saved.messages).toEqual([saved.interview.openingMessage]);
    expect(saved.interview.resumeToken).toBeTruthy();
  });
  it("isolates the board and preserves freehand strokes and image bytes", () => {
    const base = rectangleFixture();
    const stroke = {
      ...base,
      id: "stroke",
      type: "freedraw",
      points: [
        [0, 0],
        [20, 30],
      ],
      pressures: [0.2, 0.8],
      simulatePressure: false,
      lastCommittedPoint: null,
    } as ExcalidrawFreeDrawElement;
    const fileId = "file" as BinaryFileData["id"];
    const image = {
      ...base,
      id: "image",
      type: "image",
      fileId,
      status: "saved",
      scale: [1, 1],
      crop: null,
    } as ExcalidrawImageElement;
    const scene = whiteboardFixture([stroke, image]);
    scene.files = {
      [fileId]: {
        id: fileId,
        dataURL: PNG_FIXTURE as BinaryFileData["dataURL"],
        mimeType: "image/png",
        created: 1,
      },
    };
    const saved = updateSavedInterview(savedFixture(), {}, scene);
    expect(savedInterviewSchema.parse(saved).whiteboard).toEqual(scene);
    stroke.points[0][0] = 99;
    expect(saved.whiteboard.elements[0]).toMatchObject({
      points: [
        [0, 0],
        [20, 30],
      ],
    });
    expect(saved.whiteboard.files.file.dataURL).toBe(PNG_FIXTURE);
  });
  it("keeps turn baselines and pacing while an autosave captures newer drawing edits", () => {
    const saved = savedFixture();
    const previousScene = captureScene([
      { ...rectangleFixture(), id: "old", width: 1, height: 1 },
    ]);
    const afterTurn = updateSavedInterview(
      saved,
      {
        previousScene,
        previousImageFingerprint: "old-image",
        pacingCapture: { scene: previousScene, fingerprint: "old-image" },
      },
      saved.whiteboard,
    );
    const afterDrawing = updateSavedInterview(
      afterTurn,
      {},
      whiteboardFixture([{ ...rectangleFixture(), x: 30 }]),
    );
    expect(afterDrawing.previousScene).toEqual(previousScene);
    expect(afterDrawing.previousImageFingerprint).toBe("old-image");
    expect(afterDrawing.pacingCapture).toEqual(afterTurn.pacingCapture);
    expect(afterDrawing.whiteboard.elements[0].x).toBe(30);
    expect(afterDrawing.revision).not.toBe(afterTurn.revision);
  });
  it("replaces only the checkpoint when progress is saved", () => {
    const saved = savedFixture();
    const updated = updateSavedInterview(
      saved,
      { resumeToken: "new-checkpoint" },
      saved.whiteboard,
    );
    expect(updated.interview).toEqual({
      ...saved.interview,
      resumeToken: "new-checkpoint",
    });
    expect(savedInterviewSummary(updated)).toMatchObject({
      hasEnded: false,
      hasScorecard: false,
      level: "mid",
    });
  });
  it("rejects mismatched session IDs, malformed native data, and future versions", () => {
    const saved = savedFixture();
    for (const change of [
      { id: crypto.randomUUID() },
      { version: 2 },
      { whiteboard: { elements: [] } },
    ])
      expect(
        savedInterviewSchema.safeParse({ ...saved, ...change }).success,
      ).toBe(false);
  });
});
