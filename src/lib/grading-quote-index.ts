import type { ChatMessage } from "@/lib/chat";
import { candidateQuotes } from "@/lib/scorecard-quotes";

/** Prefixes locate full statements in the transcript; validation retains the original quotes. */
export function gradingQuoteIndex(messages: ChatMessage[]) {
  return candidateQuotes(messages).map((quote) => ({
    quoteId: quote.quoteId,
    quote:
      quote.quote.length > 48 ? quote.quote.slice(0, 48) + "…" : quote.quote,
  }));
}
