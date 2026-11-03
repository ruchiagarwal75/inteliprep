import type { ChatMessage } from "@/lib/chat";
import { candidateEvidenceExcerpts } from "@/lib/candidate-evidence";

/** Supply exact, bounded candidate excerpts so the model selects evidence instead of rewriting it. */
export function candidateQuotes(messages: ChatMessage[]) {
  return messages.flatMap((message, messageIndex) => {
    const quotes: { quoteId: string; messageIndex: number; quote: string }[] =
      [];
    for (const sentence of candidateEvidenceExcerpts(message)) {
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
