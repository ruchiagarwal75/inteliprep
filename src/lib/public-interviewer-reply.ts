import { exactSentences } from "@/lib/exact-sentences";
import { hasAsk, questionAtEnd } from "@/lib/open-question";

/** Only the reserved namespace and generated hash format are private identifiers. */
export function hasInternalIdentifiers(text: string): boolean {
  return /\bmmq7-|\bfresh:[a-f\d]{8,}\b/iu.test(text);
}

/** Stream safe sentences immediately. Replace a removed ask with one model-generated ask. */
export async function* publicInterviewerReply(
  parts: AsyncIterable<string>,
  { regenerate }: { regenerate?: (published: string) => Promise<string> } = {},
) {
  let buffer = "",
    published = "",
    dropped = false,
    droppedAsk = false;
  const accept = (text: string) => {
    if (hasInternalIdentifiers(text)) {
      dropped = true;
      if (hasAsk(text) || /[?？]/u.test(text)) droppedAsk = true;
      return "";
    }
    if (!published && dropped) text = text.trimStart();
    published += text;
    return text;
  };
  for await (const part of parts) {
    buffer += part;
    for (;;) {
      const sentence = exactSentences(buffer)[0];
      if (
        !sentence ||
        !/[.!?]["'’”)\]]*$/u.test(sentence) ||
        /(?:\b(?:e\.g|i\.e|etc|vs|Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St)|\b[A-Z])\.$/u.test(
          sentence,
        )
      )
        break;
      const end = buffer.indexOf(sentence) + sentence.length;
      const length = end + (/^\s*/u.exec(buffer.slice(end))?.[0].length ?? 0);
      const text = accept(buffer.slice(0, length));
      buffer = buffer.slice(length);
      if (text) yield text;
    }
  }
  const tail = accept(buffer);
  if (tail) yield tail;
  if (
    dropped &&
    (droppedAsk || !published.trim()) &&
    !questionAtEnd(published) &&
    regenerate
  ) {
    const question = (await regenerate(published)).trim();
    if (
      question &&
      !hasInternalIdentifiers(question) &&
      /[?？]\s*$/u.test(question)
    )
      yield (published.trim() ? "\n\n" : "") + question;
  }
}
