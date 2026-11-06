import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  chatMessageSchema,
  type ChatMessage,
  type ChatRequest,
} from "@/lib/chat";
import type { ChatTurnRequest } from "@/lib/chat-turn";
import {
  getCachedSession,
  InterviewSessionError,
} from "@/lib/interview-session-store";
import { interviewSessionCheckpoint } from "@/lib/interview-sessions";
import { INTERVIEW_TRANSCRIPT_CHANGED } from "@/lib/interview-sync";
import { questionAtEnd } from "@/lib/open-question";

export const MAX_TRANSCRIPT_BYTES = 96_000;
export const transcriptSchema = z.object({
  messages: z.array(chatMessageSchema).max(102),
  lastTurn: z
    .object({
      id: z.uuid(),
      requestHash: z.string(),
      afterMessageCount: z.number().int(),
      reply: z.string().max(8_000),
      listening: z.boolean(),
    })
    .optional(),
});
export type InterviewTranscript = z.infer<typeof transcriptSchema>;
const size = (messages: ChatMessage[]) =>
  Buffer.byteLength(JSON.stringify(messages), "utf8");
function unavailable(): never {
  throw new InterviewSessionError(
    "This interview has no verified server transcript. Close it without scoring and start a new interview. Your browser copy is still available.",
    409,
    false,
    "INTERVIEW_CONFIGURATION_CHANGED",
  );
}
export function initializeTranscript(id: string, opening: ChatMessage) {
  const session = getCachedSession(id);
  if (!session) throw new Error("Missing interview session");
  session.transcript = { messages: [chatMessageSchema.parse(opening)] };
  session.openQuestion = questionAtEnd(opening.content);
}
export function assertTranscriptAvailable(id: string) {
  const session = getCachedSession(id);
  if (!session?.transcript && !session?.ending) unavailable();
}

/** Caller holds the shared lease. A checkpoint alone cannot reconstruct trusted chat. */
export function prepareTranscriptTurn(input: ChatTurnRequest) {
  interviewSessionCheckpoint(input.sessionId, input, input.resumeToken);
  const session = getCachedSession(input.sessionId);
  if (!session?.transcript) unavailable();
  const transcript = session.transcript;
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        message: input.message,
      }),
    )
    .digest("hex");
  const prior = transcript.lastTurn;
  if (prior?.id === input.turnId) {
    if (
      prior.requestHash !== requestHash ||
      prior.afterMessageCount !== input.afterMessageCount
    )
      throw new InterviewSessionError(
        "This retry does not match the original message.",
        409,
      );
    return { replay: prior, request: undefined, commit: () => {} };
  }
  if (transcript.messages.length !== input.afterMessageCount)
    throw new InterviewSessionError(
      "The conversation changed. Reopen this interview before sending another message.",
      409,
      false,
      INTERVIEW_TRANSCRIPT_CHANGED,
    );
  const messages = [...transcript.messages, input.message];
  // Leave room for a bounded assistant reply and a final confirmed draft.
  if (messages.length > 99 || size(messages) > MAX_TRANSCRIPT_BYTES - 10_000)
    throw new InterviewSessionError(
      "This interview has reached its conversation limit. End it to receive feedback, or start a new interview.",
      409,
    );
  const request: ChatRequest = {
    problemId: input.problemId,
    level: input.level,
    sessionId: input.sessionId,
    resumeToken: input.resumeToken,
    scene: input.scene,
    previousScene: input.previousScene,
    diagramImage: input.diagramImage,
    messages,
  };
  return {
    replay: undefined,
    request,
    commit(reply: string, listening: boolean) {
      if (!reply.trim() || reply.length > 8_000)
        throw new Error("Invalid interviewer reply");
      const completed = listening
        ? messages
        : [
            ...messages,
            chatMessageSchema.parse({ role: "assistant", content: reply }),
          ];
      if (size(completed) > MAX_TRANSCRIPT_BYTES)
        throw new Error("Conversation limit exceeded");
      session.transcript = {
        messages: structuredClone(completed),
        lastTurn: {
          id: input.turnId,
          requestHash,
          afterMessageCount: input.afterMessageCount,
          reply,
          listening,
        },
      };
    },
  };
}

/** Ending may append an unanswered turn and one confirmed draft, never edited history. */
export function verifiedEndMessages(
  id: string,
  submitted: ChatMessage[],
): ChatMessage[] {
  const session = getCachedSession(id);
  if (session?.ending) return submitted;
  if (!session?.transcript) {
    return unavailable();
  }
  const messages = session.transcript.messages;
  const extra = submitted.slice(messages.length);
  if (
    JSON.stringify(submitted.slice(0, messages.length)) !==
      JSON.stringify(messages) ||
    extra.length > 2 ||
    extra.some((message) => message.role !== "user")
  )
    throw new InterviewSessionError(
      "The submitted history does not match the verified interview. Reopen the interview before ending it.",
      409,
      false,
      INTERVIEW_TRANSCRIPT_CHANGED,
    );
  const result = [...messages, ...extra];
  if (size(result) > MAX_TRANSCRIPT_BYTES)
    throw new InterviewSessionError(
      "The final answer exceeds this interview's conversation limit. End without including the draft.",
      400,
    );
  return structuredClone(result);
}
