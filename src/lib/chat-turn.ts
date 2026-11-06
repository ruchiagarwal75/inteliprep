import { z } from "zod";
import { chatMessageSchema, type ChatRequest } from "@/lib/chat";
import { interviewSelectionSchema } from "@/lib/interview-selection";
import { sceneSchema } from "@/lib/scene";
import { diagramImageSchema } from "@/lib/diagram-image";

/** The wire accepts one candidate turn, never a browser-authored transcript. */
export const chatTurnRequestSchema = z
  .object({
    ...interviewSelectionSchema.shape,
    sessionId: z.uuid(),
    resumeToken: z.string().min(1).max(8_000),
    messages: z.undefined().optional(),
    message: chatMessageSchema.refine((message) => message.role === "user", {
      message: "Only a new candidate message can be submitted",
    }),
    turnId: z.uuid(),
    afterMessageCount: z.number().int().min(0).max(102),
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
export type ChatTurnRequest = z.infer<typeof chatTurnRequestSchema>;

export function chatTurnPayload(
  payload: ChatRequest,
  turnId = crypto.randomUUID(),
) {
  const { messages, ...context } = payload;
  return {
    ...context,
    turnId,
    afterMessageCount: messages.length - 1,
    message: messages.at(-1),
  };
}
