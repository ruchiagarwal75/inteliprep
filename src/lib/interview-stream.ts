import { z } from "zod";
import { interviewPhaseSchema } from "@/lib/interview-phase";
import { resumeTokenSchema } from "@/lib/interview-resume";

export const INTERVIEW_STREAM_TYPE = "application/x-ndjson";
const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({
    type: z.literal("complete"),
    phase: interviewPhaseSchema.optional(),
    resumeToken: resumeTokenSchema.optional(),
  }),
]);
export type CompletedInterviewTurn = Omit<
  Extract<z.infer<typeof eventSchema>, { type: "complete" }>,
  "type"
>;

/** The final checkpoint is accepted only after the complete frame AND successful EOF. */
export async function receiveInterviewStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (text: string) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "",
    reply = "";
  let completed: CompletedInterviewTurn | undefined;
  function consume() {
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      const event = eventSchema.parse(JSON.parse(line));
      if (completed)
        throw new Error("Unexpected data after the completed reply");
      if (event.type === "complete") completed = event;
      else {
        reply += event.text;
        onDelta(event.text);
      }
    }
  }
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      consume();
    }
    buffer += decoder.decode();
    consume();
    if (buffer.trim() || !completed || !reply.trim())
      throw new Error("The reply was interrupted. Please try again.");
    return { reply, checkpoint: completed };
  } finally {
    reader.releaseLock();
  }
}
