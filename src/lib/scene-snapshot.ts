import { sceneSchema, type Scene } from "@/lib/scene";

/** Validation also deep-copies the relevant fields, isolating a sent snapshot. */
export function captureScene(elements: unknown): Scene {
  const parsed = sceneSchema.safeParse({ elements });
  if (!parsed.success)
    throw new Error(
      `Invalid whiteboard: ${parsed.error.issues[0]?.message ?? "Invalid scene"}`,
    );
  return parsed.data;
}
