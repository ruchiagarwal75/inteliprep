import type { ChatMessage } from "@/lib/chat";
import { questionAtEnd } from "@/lib/open-question";

export type QuestionMemory = {
  askedQuestions: string[];
  coveredTopics: string[];
  topicTurns?: Record<string, number>;
};
/** Built from the complete verified transcript, before model-history truncation. */
export function questionMemory(
  messages: ChatMessage[],
  coveredTopics: string[] = [],
): QuestionMemory {
  return {
    askedQuestions: [
      ...new Set(
        messages.flatMap((m) =>
          m.role === "assistant"
            ? [questionAtEnd(m.content)].filter((q): q is string => Boolean(q))
            : [],
        ),
      ),
    ],
    coveredTopics: [...new Set(coveredTopics)],
  };
}

const words = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .match(/[a-z0-9]+/gu)
      ?.filter(
        (w) =>
          !/^(?:what|how|does|would|will|your|you|the|a|an|to|of|in|is|it|when|if|and|do|can|this|that|for|with|are|be)$/u.test(
            w,
          ),
      ),
  );
export function sameQuestion(a: string, b: string) {
  const first = words(a),
    second = words(b);
  if (!first || !second || !first.size || !second.size) return false;
  const shared = [...first].filter((w) => second.has(w)).length;
  return (
    (shared === first.size && shared === second.size) ||
    (shared >= 4 && shared / Math.max(first.size, second.size) >= 0.7)
  );
}

/** Remove repeated praise/recaps, preserving factual answers and critical feedback. */
export function trimAcknowledgements(reply: string) {
  let acknowledged = false;
  return reply
    .split(/((?<=[.!?])\s+)/u)
    .filter((sentence) => {
      const acknowledgement =
        /^(?:you(?:['’]ve| have)? (?:explained|described|outlined|covered|identified|shown|highlighted|clarified)|your .{0,100}(?:indicates|shows|demonstrates|reflects|highlights|is (?:strong|good|clear))|thanks\b|thank you\b|great\b|good\b|excellent\b|(?:that|this)(?:['’]s| is) (?:a )?(?:good|great|clear|strong))/iu.test(
          sentence,
        );
      if (!acknowledgement) return true;
      if (acknowledged || sentence.split(/\s+/u).length > 25) return false;
      acknowledged = true;
      return true;
    })
    .join("")
    .replace(/[ \t]{2,}/gu, " ")
    .trim();
}
