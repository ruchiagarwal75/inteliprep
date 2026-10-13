import { z } from "zod";
import { chatRequestSchema, chatMessageSchema } from "@/lib/chat";

export const interviewEndRequestSchema = chatRequestSchema
  .safeExtend({
    sessionId: z.uuid(),
    // Allow the final assistant reply and one confirmed unsent final answer.
    messages: z.array(chatMessageSchema).min(1).max(102),
  })
  .refine(
    ({ messages }) =>
      messages.reduce(
        (length, message) => length + message.content.length,
        0,
      ) <= 96_000,
    { message: "The transcript is too large to grade in one interview" },
  );
export type InterviewEndRequest = z.infer<typeof interviewEndRequestSchema>;
export type InterviewEndSnapshot = Pick<
  InterviewEndRequest,
  "messages" | "scene" | "diagramImage"
>;
