/** Boundaries preserve the original words, including examples, decimals and URLs. */
export function exactSentences(content: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  for (const match of content.matchAll(/[.!?](?:["'’”)\]]*)(?=\s|$)/gu)) {
    const end = match.index + match[0].length;
    const text = content.slice(start, end).trim();
    if (
      match[0] === "." &&
      /(?:\b(?:e\.g|i\.e|etc|vs|Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St)|\b[A-Z])\.$/u.test(
        text,
      )
    )
      continue;
    if (text) sentences.push(text);
    start = end;
  }
  const tail = content.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences;
}
