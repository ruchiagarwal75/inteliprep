import type { ChatMessage } from "@/lib/chat";
import type { SavedInterview } from "@/lib/saved-interview";

/** Keep unsent local answers outside verified chat; never silently discard a draft. */
export function reconcileTranscript(
  saved: SavedInterview,
  messages: ChatMessage[],
) {
  const remaining = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim());
  const recovered = [...(saved.recoveredMessages ?? [])];
  for (const message of saved.messages) {
    if (message.role !== "user" || message.source === "control") continue;
    const match = remaining.indexOf(message.content.trim());
    if (match >= 0) {
      remaining.splice(match, 1);
      continue;
    }
    if (
      message.content.trim() !== saved.draftText.trim() &&
      !recovered.includes(message.content)
    )
      recovered.push(message.content);
  }
  return {
    messages,
    pendingReply: undefined,
    recoveredMessages: recovered.filter(
      (text) =>
        !messages.some(
          (message) =>
            message.role === "user" && message.content.trim() === text.trim(),
        ),
    ),
    // A recovered drawing must be sent afresh on the next turn.
    previousScene: undefined,
    previousImageFingerprint: undefined,
  };
}
