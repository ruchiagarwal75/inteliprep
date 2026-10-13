import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

export type WhiteboardScene = {
  elements: readonly ExcalidrawElement[];
  appState: Pick<AppState, "viewBackgroundColor"> &
    Partial<Pick<AppState, "scrollX" | "scrollY" | "zoom">>;
  files: BinaryFiles;
};

/** Freeze the export inputs before any async work; keep only referenced files. */
export function captureWhiteboard(scene: WhiteboardScene): WhiteboardScene {
  const elements = scene.elements.filter(
    (element) => !element.isDeleted && element.type !== "selection",
  );
  const files: BinaryFiles = {};
  for (const element of elements) {
    if (
      element.type === "image" &&
      element.fileId &&
      scene.files[element.fileId]
    )
      files[element.fileId] = scene.files[element.fileId];
  }
  return structuredClone({ elements, appState: scene.appState, files });
}

const editorFields = new Set([
  "version",
  "versionNonce",
  "updated",
  "isDeleted",
  "locked",
  "index",
]);

/** Visual changes include layout, styling, freehand strokes, and image contents. */
export function whiteboardContentKey(scene: WhiteboardScene): string {
  const elements = scene.elements.filter(
    (element) => !element.isDeleted && element.type !== "selection",
  );
  const referenced = new Set<string>(
    elements.flatMap((element) =>
      element.type === "image" && element.fileId ? [element.fileId] : [],
    ),
  );
  const visual = {
    elements: elements.map((element) =>
      Object.fromEntries(
        Object.entries(element).filter(([key]) => !editorFields.has(key)),
      ),
    ),
    background: scene.appState.viewBackgroundColor,
    files: Object.fromEntries(
      Object.entries(scene.files)
        .filter(([id]) => referenced.has(id))
        .map(([id, file]) => [id, file.dataURL]),
    ),
  };
  return JSON.stringify(visual, (_key, value: unknown) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(
          Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
        )
      : value,
  );
}

export async function fingerprintWhiteboard(
  scene: WhiteboardScene,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(whiteboardContentKey(scene)),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
