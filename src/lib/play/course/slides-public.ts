import { z } from "zod";
import { COURSE_DIAGRAMS } from "./slide-diagrams";

/** Teaching content only. Quiz answers and grading definitions never enter this shape. */
export const courseSlideSchema = z.object({
  title: z.string().min(1),
  lines: z.array(z.string().min(1)).min(1).max(4),
  diagram: z.enum(COURSE_DIAGRAMS).optional(),
});
export const courseLessonSchema = z.object({
  level: z.number().int().min(1).max(9),
  title: z.string(),
  slides: z.array(courseSlideSchema).min(1),
  seenThrough: z.number().int().min(-1),
  lastViewedIndex: z.number().int().nonnegative(),
  complete: z.boolean(),
});
export type CourseLesson = z.infer<typeof courseLessonSchema>;
