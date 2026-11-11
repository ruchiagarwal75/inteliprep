import type { ChatMessage } from "@/lib/chat";
import { exactSentences } from "@/lib/exact-sentences";

const normalized = (text: string) =>
  text.toLowerCase().replace(/\s+/gu, " ").trim();
export function repeatedInterviewerSentences(
  reply: string,
  messages: ChatMessage[],
) {
  const seen = new Set(
    messages
      .filter((m) => m.role === "assistant")
      .flatMap((m) => exactSentences(m.content).map(normalized)),
  );
  return exactSentences(reply).filter((sentence) => {
    const key = normalized(sentence),
      repeated = seen.has(key);
    seen.add(key);
    return repeated;
  });
}
export function withoutRepeatedSentences(
  reply: string,
  messages: ChatMessage[],
) {
  const repeated = new Set(
    repeatedInterviewerSentences(reply, messages).map(normalized),
  );
  return exactSentences(reply)
    .filter((s) => !repeated.has(normalized(s)))
    .join(" ");
}
