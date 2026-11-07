import type { ChatMessage } from "@/lib/chat";

export const MAX_MODEL_HISTORY_BYTES = 32_000;
export const MAX_MODEL_RECENT_MESSAGES = 8;
export const MAX_MODEL_TEXT_BYTES = 128_000;
const bytes = (text: string) => new TextEncoder().encode(text).byteLength;

/** Keep complete recent turns plus the configured opening, within a fixed text budget. */
export function boundedModelMessages(messages: ChatMessage[]): ChatMessage[] {
  if (
    messages.length <= MAX_MODEL_RECENT_MESSAGES + 1 &&
    bytes(JSON.stringify(messages)) <= MAX_MODEL_HISTORY_BYTES
  )
    return messages;
  const opening = messages[0]?.role === "assistant" ? messages[0] : undefined;
  const kept: ChatMessage[] = [];
  for (let i = messages.length - 1; i >= (opening ? 1 : 0); i--) {
    if (kept.length >= MAX_MODEL_RECENT_MESSAGES) break;
    const next = [...(opening ? [opening] : []), messages[i], ...kept];
    if (bytes(JSON.stringify(next)) > MAX_MODEL_HISTORY_BYTES) break;
    kept.unshift(messages[i]);
  }
  if (!kept.length)
    throw new Error(
      "This message is too large for the interview. Shorten it before trying again.",
    );
  return [...(opening ? [opening] : []), ...kept];
}

/** Bounded, extractive memory. Candidate words stay untrusted; the full transcript stays on the server. */
export function olderTurnSummary(
  messages: ChatMessage[],
  recent = boundedModelMessages(messages),
) {
  const kept = new Set(recent);
  const excerpts: { role: ChatMessage["role"]; excerpt: string }[] = [];
  for (const message of messages.filter((m) => !kept.has(m)).reverse()) {
    if (message.source === "control") continue;
    const excerpt = message.content.replace(/\s+/gu, " ").trim();
    const row = {
      role: message.role,
      excerpt:
        excerpt.length > 360
          ? excerpt.slice(0, 240) + " … " + excerpt.slice(-100)
          : excerpt,
    };
    if (bytes(JSON.stringify([row, ...excerpts])) > 4_000) break;
    excerpts.unshift(row);
  }
  return excerpts;
}

/** Includes JSON escaping and instructions. Images have separate fixed dimension/byte limits. */
export function assertModelTextBudget(...text: string[]) {
  if (
    text.reduce((total, value) => total + bytes(value), 0) >
    MAX_MODEL_TEXT_BYTES
  )
    throw new Error(
      "This interview has reached its model context limit. End the interview or shorten the current message.",
    );
}
