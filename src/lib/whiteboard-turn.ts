import { captureScene } from "@/lib/scene-snapshot";
import {
  captureWhiteboard,
  fingerprintWhiteboard,
  type WhiteboardScene,
} from "@/lib/whiteboard-snapshot";
import { exportWhiteboardImage } from "@/lib/whiteboard-image";

/** Capture text and pixels from the same drawing, with a separate image baseline. */
export async function prepareWhiteboardTurn(
  current: WhiteboardScene,
  previousImageFingerprint?: string,
  exportImage = exportWhiteboardImage,
) {
  const snapshot = captureWhiteboard(current);
  const scene = captureScene(snapshot.elements);
  if (!snapshot.elements.length)
    return { scene, fingerprint: "empty", canCommitImage: true };
  let fingerprint: string | undefined;
  try {
    fingerprint = await fingerprintWhiteboard(snapshot);
    if (fingerprint === previousImageFingerprint)
      return { scene, fingerprint, canCommitImage: true };
    const diagramImage = await exportImage(snapshot);
    return { scene, fingerprint, diagramImage, canCommitImage: true };
  } catch {
    // Text still works. Keep the old image baseline so the next turn retries.
    return {
      scene,
      fingerprint,
      canCommitImage: false,
      imageWarning:
        "The whiteboard image couldn't be attached. Continuing with diagram text.",
    };
  }
}
