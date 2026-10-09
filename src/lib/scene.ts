import { z } from "zod";

export const MAX_SCENE_ELEMENTS = 500;
export const MAX_LABEL_LENGTH = 1_000;

const id = z.string().min(1).max(128);
const coordinate = z.number().finite().min(-1_000_000).max(1_000_000);
const size = z.number().finite().min(0).max(1_000_000);
const base = z.object({
  id,
  x: coordinate,
  y: coordinate,
  width: size,
  height: size,
  angle: z.number().finite().default(0),
  isDeleted: z.boolean().default(false),
  frameId: id.nullable().default(null),
  groupIds: z.array(id).max(20).default([]),
});

export const sceneComponentSchema = base.extend({
  type: z.enum(["rectangle", "ellipse", "diamond"]),
});

export const sceneTextSchema = base.extend({
  type: z.literal("text"),
  text: z.string().max(MAX_LABEL_LENGTH),
  containerId: id.nullable().default(null),
});

const binding = z.object({ elementId: id });
const arrowhead = z.enum([
  "arrow",
  "bar",
  "dot",
  "circle",
  "circle_outline",
  "triangle",
  "triangle_outline",
  "diamond",
  "diamond_outline",
  "crowfoot_one",
  "crowfoot_many",
  "crowfoot_one_or_many",
]);

export const sceneArrowSchema = base.extend({
  type: z.literal("arrow"),
  points: z
    .array(z.tuple([coordinate, coordinate]))
    .min(2)
    .max(1_000),
  startBinding: binding.nullable().default(null),
  endBinding: binding.nullable().default(null),
  startArrowhead: arrowhead.nullable().default(null),
  endArrowhead: arrowhead.nullable().default("arrow"),
});

const frame = base.extend({
  type: z.enum(["frame", "magicframe"]),
  name: z.string().max(MAX_LABEL_LENGTH).nullable().default(null),
});

// Preserve unsupported element kinds so the description can flag what it misses.
const other = base.extend({
  type: z.enum([
    "line",
    "freedraw",
    "image",
    "embeddable",
    "iframe",
    "selection",
  ]),
});

export const sceneElementSchema = z.discriminatedUnion("type", [
  sceneComponentSchema,
  sceneTextSchema,
  sceneArrowSchema,
  frame,
  other,
]);

export const sceneSchema = z
  .object({
    // Zod strips editor settings, image files, and styling fields we don't use.
    elements: z.array(sceneElementSchema).max(MAX_SCENE_ELEMENTS),
  })
  .refine(
    ({ elements }) =>
      new Set(elements.map((element) => element.id)).size === elements.length,
    { message: "Scene element IDs must be unique", path: ["elements"] },
  );

export type Scene = z.infer<typeof sceneSchema>;
export type SceneElement = z.infer<typeof sceneElementSchema>;
export type SceneComponent = z.infer<typeof sceneComponentSchema>;
export type SceneArrow = z.infer<typeof sceneArrowSchema>;
export type SceneText = z.infer<typeof sceneTextSchema>;

export function isSceneComponent(
  element: SceneElement,
): element is SceneComponent {
  return ["rectangle", "ellipse", "diamond"].includes(element.type);
}
