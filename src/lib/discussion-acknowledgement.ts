import type { ProblemTrack } from "@/lib/interview-selection";
import type { ChatMessage } from "@/lib/chat";
import { acknowledgeAnswer } from "@/lib/review-probes";
/** Resolve only server-issued quote IDs; compatibility permits an exact latest-answer excerpt. */
export function discussionAcknowledgement(
  messages: ChatMessage[],
  value: { acknowledgement: string; acknowledgementQuote: string },
  quotes: { quoteId: string; quote: string; messageIndex: number }[],
  track: ProblemTrack = "core",
) {
  if (track === "genai") return "";
  const latest = messages.findLastIndex((m) => m.role === "user");
  const cited = quotes.find(
    (q) =>
      q.quoteId === value.acknowledgementQuote && q.messageIndex === latest,
  );
  return acknowledgeAnswer(
    messages,
    value.acknowledgement,
    cited?.quote ?? value.acknowledgementQuote,
  );
}
