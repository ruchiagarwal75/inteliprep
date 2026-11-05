import type { ChatMessage } from "@/lib/chat";
import type { InterviewSaveUpdate } from "@/lib/saved-interview";
import { finalInterviewMessages } from "@/lib/final-interview-messages";

/** Closing is local archival, never a request to grade an unreadable server checkpoint. */
export function closedInterviewUpdate(
  messages: ChatMessage[],
  draftText: string,
): InterviewSaveUpdate {
  return {
    messages: finalInterviewMessages(messages),
    draftText,
    hasEnded: true,
    closedWithoutScoring: true,
    endedAt: new Date().toISOString(),
    pendingReply: undefined,
    endRequest: undefined,
    gradingError: undefined,
  };
}
