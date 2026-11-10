/** Quote a scene label when the sentence has not already supplied an article. */
export function quoteDiagramLabels(text: string, supplied: readonly string[]) {
  const labels = [
    ...new Set(
      supplied
        .map((label) => label.replace(/\s+/gu, " ").trim())
        .filter(
          (label) =>
            label.length > 1 &&
            label.length <= 120 &&
            !/^unlabeled\b/iu.test(label),
        ),
    ),
  ]
    .slice(0, 32)
    .sort((a, b) => b.length - a.length);
  if (!labels.length) return text;
  const escaped = labels.map((label) =>
    label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"),
  );
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}_])(?:${escaped.join("|")})(?![\\p{L}\\p{N}_])`,
    "giu",
  );
  return text.replace(pattern, (matched: string, offset: number) => {
    const before = text.slice(0, offset);
    if (/(?:["“‘'`]|\b(?:the|a|an|your)\s+)$/iu.test(before)) return matched;
    return JSON.stringify(
      labels.find(
        (label) => label.toLocaleLowerCase() === matched.toLocaleLowerCase(),
      ) ?? matched,
    );
  });
}
