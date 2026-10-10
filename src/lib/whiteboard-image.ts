import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";
import {
  diagramImageSchema,
  MAX_DIAGRAM_IMAGE_BYTES,
  MAX_DIAGRAM_IMAGE_DIMENSION,
  PNG_DATA_URL_PREFIX,
} from "@/lib/diagram-image";

/** Runs in the browser; importing this module does not load the canvas editor. */
export async function exportWhiteboardImage(
  scene: WhiteboardScene,
): Promise<string> {
  const { exportToBlob } = await import("@excalidraw/excalidraw");
  if (typeof document !== "undefined" && document.fonts)
    await document.fonts.ready;

  // Reduce photo-heavy exports if needed while keeping the normal diagram sharp.
  for (const dimension of [MAX_DIAGRAM_IMAGE_DIMENSION, 960, 640, 320]) {
    const blob = await exportToBlob({
      elements: scene.elements.filter((element) => !element.isDeleted),
      files: scene.files,
      appState: {
        ...scene.appState,
        exportBackground: true,
        exportEmbedScene: false,
        exportWithDarkMode: false,
        exportScale: 1,
      },
      mimeType: "image/png",
      maxWidthOrHeight: dimension,
      exportPadding: 20,
    });
    if (blob.size > MAX_DIAGRAM_IMAGE_BYTES) continue;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 32_768)
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
    return diagramImageSchema.parse(PNG_DATA_URL_PREFIX + btoa(binary));
  }
  throw new Error("Whiteboard image is too large to attach");
}
