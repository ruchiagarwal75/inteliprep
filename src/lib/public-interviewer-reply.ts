import { exactSentences } from "@/lib/exact-sentences";

type ProbeKey = { id: string; topic?: string };
/** Plain words such as cache are also normal design vocabulary, not serialized keys. */
export function configuredInternalTopicIds(probes: readonly ProbeKey[]) {
  return [
    ...new Set(probes.flatMap((probe) => [probe.id, probe.topic ?? ""])),
  ].filter((id) => /[|_:\\-]/u.test(id));
}
const tokenCharacter = (text: string) => /[\p{L}\p{N}_|:\\-]/u.test(text);

/** Match literal configured keys, never arbitrary field names, pipes or request IDs. */
export function hasInternalIdentifiers(
  text: string,
  topicIds: readonly string[] = [],
): boolean {
  if (/\bfresh:[a-f\d]{8,}\b/iu.test(text)) return true;
  const lower = text.toLowerCase();
  return topicIds.some((id) => {
    if (!id) return false;
    const key = id.toLowerCase();
    for (
      let at = lower.indexOf(key);
      at >= 0;
      at = lower.indexOf(key, at + 1)
    ) {
      if (
        !tokenCharacter(lower[at - 1] ?? "") &&
        !tokenCharacter(lower[at + key.length] ?? "")
      )
        return true;
    }
    return false;
  });
}

/** A chunk may stop at punctuation inside a serialized regex-like key. */
function maskKeyPunctuation(text: string, ids: readonly string[]) {
  const lower = text.toLowerCase();
  const characters = text.split("");
  for (const id of ids) {
    const key = id.toLowerCase();
    if (!key) continue;
    for (
      let at = lower.indexOf(key[0] ?? "");
      at >= 0;
      at = lower.indexOf(key[0] ?? "", at + 1)
    ) {
      const tail = lower.slice(at);
      const length = lower.startsWith(key, at)
        ? key.length
        : key.startsWith(tail)
          ? tail.length
          : 0;
      if (tokenCharacter(lower[at - 1] ?? "")) continue;
      for (let index = at; index < at + length; index++)
        if (/[.!?]/u.test(characters[index])) characters[index] = "·";
    }
  }
  return characters.join("");
}

/** Release safe completed sentences as they arrive, dropping only contaminated ones. */
export async function* publicInterviewerReply(
  parts: AsyncIterable<string>,
  {
    topicIds = [],
    onEmpty,
  }: { topicIds?: readonly string[]; onEmpty?: () => string } = {},
) {
  let buffer = "",
    emitted = false,
    dropped = false;
  const accept = (text: string) => {
    if (hasInternalIdentifiers(text, topicIds)) {
      dropped = true;
      return "";
    }
    if (!emitted && dropped) text = text.trimStart();
    if (text) emitted = true;
    return text;
  };
  for await (const part of parts) {
    buffer += part;
    for (;;) {
      const masked = maskKeyPunctuation(buffer, topicIds);
      const sentence = exactSentences(masked)[0];
      if (
        !sentence ||
        !/[.!?]["'’”)\]]*$/u.test(sentence) ||
        /(?:\b(?:e\.g|i\.e|etc|vs|Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St)|\b[A-Z])\.$/u.test(
          sentence,
        )
      )
        break;
      const end = masked.indexOf(sentence) + sentence.length;
      const length = end + (/^\s*/u.exec(buffer.slice(end))?.[0].length ?? 0);
      const text = accept(buffer.slice(0, length));
      buffer = buffer.slice(length);
      if (text) yield text;
    }
  }
  const tail = accept(buffer);
  if (tail) yield tail;
  if (dropped && !emitted && onEmpty) {
    const fallback = onEmpty();
    if (fallback && !hasInternalIdentifiers(fallback, topicIds)) yield fallback;
  }
}
