import type { ChatMessage } from "@/lib/chat";

export function questionAtEnd(reply: string) {
  return reply.match(/[^.!?\n]*[?？]\s*$/u)?.[0].trim();
}
export function hasExplanation(messages: ChatMessage[]) {
  const start = messages.findLastIndex(
    (m) => m.role === "user" && m.action === "explain",
  );
  return messages
    .slice(start < 0 ? 0 : start)
    .some(
      (m) =>
        m.role === "user" &&
        m.source !== "control" &&
        (!m.action || m.action === "explain") &&
        m.content.trim().length > 0,
    );
}
export function hasAsk(reply: string) {
  if (/[?？]\s*$/u.test(reply)) return true;
  const ending =
    reply
      .trim()
      .split(/(?<=[.!?])\s+|\n+/u)
      .at(-1) ?? "";
  return /^(?:please\b|you can\b|choose\b|draw\b|sketch\b|explain\b|walk\b|end the interview\b|keep\b|take your time\b|go ahead\b|let.s stay on your design\b|continue\b|describe\b|tell me\b|review\b|confirm\b|clarify\b)/iu.test(
    ending,
  );
}
