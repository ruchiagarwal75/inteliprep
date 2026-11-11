import type { ProblemSummary, ProblemTrack } from "@/lib/interview-selection";
export const TRACK_LABELS = {
  core: "System design",
  genai: "AI / ML system design",
} as const;
export const TRACK_DESCRIPTIONS = {
  core: "Classic backend design: APIs, storage, scaling and reliability.",
  genai:
    "Design AI products and ML systems: RAG, assistants, agents, recommendations and ads ranking.",
} as const;
export const problemTrack = (
  problem?: Pick<ProblemSummary, "track">,
): ProblemTrack => problem?.track ?? "core";
export function parseProblemTrack(value: unknown): ProblemTrack | undefined {
  return value === "core" || value === "genai" ? value : undefined;
}
export const problemsInTrack = (
  problems: ProblemSummary[],
  track: ProblemTrack,
) => problems.filter((p) => problemTrack(p) === track);
export function nextProblemInTrack(
  problems: ProblemSummary[],
  currentId: string,
) {
  const current = problems.find((p) => p.problemId === currentId);
  const options = problemsInTrack(problems, problemTrack(current));
  const index = options.findIndex((p) => p.problemId === currentId);
  return options[(index + 1) % options.length];
}
