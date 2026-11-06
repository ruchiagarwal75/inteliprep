import { z } from "zod";
import type { ChatMessage } from "@/lib/chat";
import type { SavedInterview } from "@/lib/saved-interview";
import { lastCandidateAction } from "@/lib/candidate-actions";

export const pendingChatReplySchema = z.object({
  turnId: z.uuid().optional(),
  retryAt: z.number().finite().optional(),
  messageIndex: z.number().int().min(0).max(101),
  error: z.string().min(1).max(1_000).optional(),
});
export type PendingChatReply = z.infer<typeof pendingChatReplySchema>;
export const INCOMPLETE_CHAT_REPLY =
  "This message has no completed reply. Please retry.";

/** Recover interrupted requests and older unanswered discussion turns after reload. */
export function restoredPendingReply(
  saved?: SavedInterview,
): PendingChatReply | undefined {
  if (!saved || saved.hasEnded) return undefined;
  if (saved.pendingReply)
    return {
      ...saved.pendingReply,
      error: saved.pendingReply.error ?? INCOMPLETE_CHAT_REPLY,
    };
  const messageIndex = saved.messages.length - 1;
  const action = lastCandidateAction(saved.messages);
  if (
    saved.messages[messageIndex]?.role === "user" &&
    action !== "draw" &&
    action !== "explain"
  )
    return { messageIndex, error: INCOMPLETE_CHAT_REPLY };
}

/** Retry the original user turn, dropping partial output instead of appending it again. */
export function retryChatMessages(
  messages: ChatMessage[],
  pending: PendingChatReply,
): ChatMessage[] {
  if (messages[pending.messageIndex]?.role !== "user")
    throw new Error("The unanswered message could not be found.");
  return messages.slice(0, pending.messageIndex + 1);
}
