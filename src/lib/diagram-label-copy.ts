import type { ProblemTrack } from "@/lib/interview-selection";

const COMMON_LABEL =
  /^(?:cache|users?|clients?|servers?|database|storage|queue|model|llm|gpu|api|api servers?|id generator|load balancer|orchestrator|planner|reranker|guardrails|moderation|embeddings?)$/iu;
/** Keep common nouns natural and quote distinctive scene names when needed. */
export function quoteDiagramLabels(
  text: string,
  supplied: readonly string[],
  track: ProblemTrack = "core",
) {
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
    if (/["“‘'`]$/u.test(before)) return matched;
    if (COMMON_LABEL.test(matched)) {
      const common = matched
        .split(/\s+/u)
        .map((word) => (/^[A-Z]{2,}$/u.test(word) ? word : word.toLowerCase()))
        .join(" ");
      return !before.trim() || /[.!?]\s*$/u.test(before)
        ? common.charAt(0).toUpperCase() + common.slice(1)
        : common;
    }
    // Preserve the core track's previous treatment of articles before distinctive labels.
    if (track === "core" && /\b(?:the|a|an|your)\s+$/iu.test(before))
      return matched;
    return JSON.stringify(
      labels.find(
        (label) => label.toLocaleLowerCase() === matched.toLocaleLowerCase(),
      ) ?? matched,
    );
  });
}
