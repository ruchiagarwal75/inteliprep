import type { ProblemTrack } from "@/lib/interview-selection";

/** Both tracks use plain labels in sentences, while keeping technical acronyms. */
export function formatDiagramLabels(
  text: string,
  supplied: readonly string[],
  track?: ProblemTrack,
) {
  void track; // Retained for callers selecting either track; formatting is shared.
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
    .sort((a, b) => b.length - a.length)
    .slice(0, 32);
  if (!labels.length) return text;
  const patterns = labels.map((label) => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    return `(?:"${escaped}"|“${escaped}”|‘${escaped}’|'${escaped}'|${escaped})`;
  });
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}_])(?:${patterns.join("|")})(?![\\p{L}\\p{N}_])`,
    "giu",
  );
  return text.replace(pattern, (matched: string, offset: number) => {
    const plain = matched
      .replace(/^["“‘']|["”’']$/gu, "")
      .toLowerCase()
      .replace(/\b(?:llm|acl|api|id|db|gpu)\b/gu, (word) => word.toUpperCase());
    const before = text.slice(0, offset);
    return !before.trim() || /[.!?]\s*$/u.test(before)
      ? plain.charAt(0).toUpperCase() + plain.slice(1)
      : plain;
  });
}
