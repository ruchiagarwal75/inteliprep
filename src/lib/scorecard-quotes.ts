import type { ChatMessage } from "@/lib/chat";
import {
  isCandidateEvidence,
  isPacingOnlyText,
} from "@/lib/candidate-evidence";

/** Supply exact, bounded candidate excerpts so the model selects evidence instead of rewriting it. */
export function candidateQuotes(messages: ChatMessage[]) {
  return messages.flatMap((message, messageIndex) => {
    if (!isCandidateEvidence(message)) return [];
    const quotes: { quoteId: string; messageIndex: number; quote: string }[] =
      [];
    for (const match of message.content.matchAll(
      /[\s\S]+?(?:[.!?](?=\s|$)|$)/gu,
    )) {
      const sentence = match[0].trim();
      if (isPacingOnlyText(sentence)) continue;
      for (let offset = 0; offset < sentence.length; offset += 500) {
        const quote = sentence.slice(offset, offset + 500).trim();
        if (quote)
          quotes.push({
            quoteId: `m${messageIndex}q${quotes.length}`,
            messageIndex,
            quote,
          });
      }
    }
    return quotes;
  });
}
