import { z } from "zod";
import { COURSE_DIAGRAMS } from "./slide-diagrams";

/** Teaching content only. Quiz answers and grading definitions never enter this shape. */
export const MAX_COURSE_SLIDES = 100;
export const slideBodyBlockSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("paragraph"), text: z.string().min(1) }),
  z.object({
    kind: z.literal("bullets"),
    items: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    kind: z.literal("numbered"),
    items: z.array(z.string().min(1)).min(1),
  }),
]);
export type SlideBodyBlock = z.infer<typeof slideBodyBlockSchema>;
export const courseSlideSchema = z.object({
  title: z.string().min(1),
  body: z.array(slideBodyBlockSchema).min(1),
  diagram: z.enum(COURSE_DIAGRAMS).optional(),
});
export const courseLessonSchema = z.object({
  level: z.number().int().min(1).max(9),
  title: z.string(),
  slides: z.array(courseSlideSchema).min(1).max(MAX_COURSE_SLIDES),
  seenThrough: z.number().int().min(-1),
  lastViewedIndex: z
    .number()
    .int()
    .min(0)
    .max(MAX_COURSE_SLIDES - 1),
  complete: z.boolean(),
});
export type CourseLesson = z.infer<typeof courseLessonSchema>;
