import { exactSentences } from "@/lib/exact-sentences";

const normalized = (text: string) =>
  text
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
const longPassage = (text: string) =>
  text.length >= 24 && text.split(/\s+/u).length >= 6;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

/** Remove copied candidate passages while allowing short names, numbers and diagram labels. */
export function candidateEchoRemover(candidateTexts: string[]) {
  const candidates = candidateTexts.map(normalized);
  const passages = [
    ...new Set(
      candidateTexts.flatMap((text) => [text, ...exactSentences(text)]),
    ),
  ]
    .filter(longPassage)
    .sort((a, b) => b.length - a.length);
  const prefixes = passages.map(
    (text) =>
      new RegExp(
        "^(?:(?:You (?:said|wrote|described|explained)|Your (?:message|answer))\\s*:\\s*)?[\"“']?\\s*" +
          text.trim().split(/\s+/u).map(escape).join("\\s+") +
          "(?:[\"”'])?(?=\\s|[,;:]|$)",
        "iu",
      ),
  );
  const isEcho = (text: string) =>
    longPassage(text) &&
    candidates.some((candidate) => candidate.includes(normalized(text)));
  return (text: string) => {
    let result = text.trim();
    for (const prefix of prefixes)
      result = result.replace(prefix, "").trimStart();
    result = result.replace(
      /“([^”]+)”|"([^"]+)"|'([^'\n]+)'/gu,
      (
        whole: string,
        curly: string | undefined,
        straight: string | undefined,
        single: string | undefined,
      ) => (isEcho(curly ?? straight ?? single ?? "") ? "" : whole),
    );
    result = result.replace(
      /^\s*>\s*(.+)$/gmu,
      (whole: string, quote: string) => (isEcho(quote) ? "" : whole),
    );
    return result
      .replace(
        /^(?:You (?:said|wrote|described|explained)|Your (?:message|answer))\s*:\s*/iu,
        "",
      )
      .replace(/^[\s,;:]+/u, "")
      .replace(/\s+/gu, " ")
      .trim();
  };
}
