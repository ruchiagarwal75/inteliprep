import type { ChatMessage } from "@/lib/chat";

export const WRAP_UP_QUESTION =
  "We're close to time. Is there anything you'd change or add before we wrap up?";

export function hasWrapUpQuestion(messages: ChatMessage[]) {
  return messages.some(
    (message) =>
      message.role === "assistant" &&
      message.content.includes(WRAP_UP_QUESTION),
  );
}

/** Final exhaustion invites final thoughts once, without ordering the candidate to end. */
export function closeDiscussion(
  messages: ChatMessage[],
  _signal?: AbortSignal,
) {
  void _signal;
  return hasWrapUpQuestion(messages) ? undefined : WRAP_UP_QUESTION;
}

export function isOrderLikeWrapUp(reply: string) {
  return /\b(?:end|finish|conclude) (?:the|this|your) interview\b/iu.test(
    reply,
  );
}
