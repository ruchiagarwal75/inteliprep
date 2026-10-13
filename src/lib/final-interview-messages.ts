import type { ChatMessage } from "@/lib/chat";

/** A confirmed draft becomes candidate evidence once; empty streaming bubbles don't. */
export function finalInterviewMessages(
  messages: ChatMessage[],
  draft?: string,
): ChatMessage[] {
  const answer = draft?.trim();
  return structuredClone([
    ...messages.filter((message) => message.content.trim()),
    ...(answer ? [{ role: "user" as const, content: answer }] : []),
  ]);
}
