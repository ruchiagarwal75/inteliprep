import type { ProblemDefinition } from "@/lib/problems";
import { probeTopic } from "@/lib/probe-topics";

/** Read legacy per-stage keys without resetting their interview-wide budgets. */
export function globalTopicCounts(
  counts: Record<string, number> = {},
  problem?: ProblemDefinition,
) {
  const result: Record<string, number> = {};
  for (const [key, count] of Object.entries(counts)) {
    const prefix = problem?.phases.find((p) => key.startsWith(p.id + ":"))?.id;
    const topic = prefix ? key.slice(prefix.length + 1) : key;
    const aliases =
      problem?.reviewProbes
        .filter((p) => probeTopic(p) === topic)
        .map((p) => p.id) ?? [];
    for (const id of aliases.length ? aliases : [topic])
      result[id] = Math.min(100, (result[id] ?? 0) + count);
  }
  return result;
}
export const topicWasAnswered = (covered: string[] = [], topicId: string) =>
  covered.includes("issue:" + topicId);
