import type { ProblemTrack } from "@/lib/interview-selection";
type Probe = { topicPattern: string };
/** A named GenAI topic must constrain the question, not merely label it. */
export function focusGenaiProbes<T extends Probe>(
  track: ProblemTrack,
  probes: T[],
  requested?: string,
): T[] {
  if (track !== "genai" || !requested) return probes;
  const matching = probes.filter((p) =>
    new RegExp(p.topicPattern, "iu").test(requested),
  );
  return matching.length ? matching : probes;
}
export function questionMatchesGenaiTopic(
  track: ProblemTrack,
  probe: Probe | undefined,
  question: string,
) {
  return (
    track !== "genai" ||
    Boolean(probe && new RegExp(probe.topicPattern, "iu").test(question))
  );
}
