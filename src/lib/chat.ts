import { z } from "zod";
import { sceneSchema } from "@/lib/scene";
import { diagramImageSchema } from "@/lib/diagram-image";
import { interviewSelectionSchema } from "@/lib/interview-selection";
import { candidateActionSchema } from "@/lib/candidate-actions";

/** Roles exchanged with the model. The database uses interviewer/candidate
 * (see docs/spec.md "Data model"); that mapping lands with persistence. */
export const chatRoleSchema = z.enum(["user", "assistant"]);

export const chatMessageSchema = z
  .object({
    role: chatRoleSchema,
    content: z.string().trim().min(1).max(8_000),
    action: candidateActionSchema.optional(),
  })
  .refine(({ role, action }) => role === "user" || action === undefined, {
    message: "Only candidate messages may include pacing actions",
    path: ["action"],
  });

export const chatRequestSchema = z
  .object({
    ...interviewSelectionSchema.shape,
    sessionId: z.uuid().optional(),
    messages: z.array(chatMessageSchema).min(1).max(100),
    scene: sceneSchema.optional(),
    previousScene: sceneSchema.optional(),
    diagramImage: diagramImageSchema.optional(),
  })
  .refine(
    ({ diagramImage, scene }) =>
      !diagramImage || scene?.elements.some((element) => !element.isDeleted),
    {
      message: "Whiteboard images require a nonempty current scene",
      path: ["diagramImage"],
    },
  );

export type ChatRole = z.infer<typeof chatRoleSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
