import type { Scene } from "@/lib/scene";

/** Submitted captures govern pacing; successful reply captures govern delivery. */
export type PacingCapture = { scene: Scene; fingerprint?: string };

export function drawingChanged(
  current: PacingCapture,
  previous?: PacingCapture,
): boolean {
  if (!previous) return false;
  if (current.fingerprint !== undefined && previous.fingerprint !== undefined)
    return current.fingerprint !== previous.fingerprint;
  return JSON.stringify(current.scene) !== JSON.stringify(previous.scene);
}
