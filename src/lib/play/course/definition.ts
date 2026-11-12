import "server-only";
import { z } from "zod";
import { courseSlideSchema } from "./slides-public";
export const courseQuestionSchema = z.object({
  id: z.string().regex(/^T[1-9]-Q[1-9]$/u),
  title: z.string().min(1),
  type: z.enum(["concept", "flaw", "math"]),
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  keyIdea: z.string().min(1),
  why: z.string().min(1),
  ifWrong: z.record(z.string(), z.string()).default({}),
});
export const courseTopicSchema = z.object({
  level: z.number().int().min(1).max(9),
  title: z.string().min(1),
  slides: z.array(courseSlideSchema).min(3).max(6),
  questions: z.array(courseQuestionSchema).min(6).max(8),
});
export type CourseTopic = z.infer<typeof courseTopicSchema>;
