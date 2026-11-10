import type { ChatMessage } from "@/lib/chat";
import { candidateQuotes } from "@/lib/scorecard-quotes";
/** Preserve old explanations and recent answers under a fixed payload budget. */
export function genaiDiscussionQuotes(messages: ChatMessage[]) {
  const all = candidateQuotes(messages);
  const seenMessages = new Set<number>();
  const firstPerMessage = all.filter((q) => {
    if (seenMessages.has(q.messageIndex)) return false;
    seenMessages.add(q.messageIndex);
    return true;
  });
  const selected: typeof all = [];
  const seen = new Set<string>();
  let bytes = 0;
  for (const quote of [...firstPerMessage, ...all.slice(-60), ...all]) {
    if (seen.has(quote.quoteId)) continue;
    const size = new TextEncoder().encode(JSON.stringify(quote)).byteLength + 1;
    if (bytes + size > 48_000) continue;
    selected.push(quote);
    seen.add(quote.quoteId);
    bytes += size;
  }
  return selected.sort(
    (a, b) =>
      a.messageIndex - b.messageIndex || a.quoteId.localeCompare(b.quoteId),
  );
}
