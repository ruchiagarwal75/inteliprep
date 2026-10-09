import { z } from "zod";
import { sceneSchema } from "@/lib/scene";

/** Roles exchanged with the model. The database uses interviewer/candidate
 * (see docs/spec.md "Data model"); that mapping lands with persistence. */
export const chatRoleSchema = z.enum(["user", "assistant"]);

export const chatMessageSchema = z.object({
  role: chatRoleSchema,
  content: z.string().trim().min(1).max(8_000),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  scene: sceneSchema.optional(),
  previousScene: sceneSchema.optional(),
});

export type ChatRole = z.infer<typeof chatRoleSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
