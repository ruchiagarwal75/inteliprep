import "server-only";
import type { InterviewProgress } from "@/lib/interview-progress";
import type { PhaseState } from "@/lib/interview-sessions";
import type { ProblemDefinition } from "@/lib/problems";
import type { Scene } from "@/lib/scene";
import { hasSketch } from "@/lib/drawing-state";

export function planPhaseProgress(
  problem: ProblemDefinition,
  state: PhaseState,
  progress: InterviewProgress,
  scene?: Scene,
  newlyCovered: number[] = [],
) {
  const phase = problem.phases[state.phaseIndex];
  if (!phase) throw new Error("Unknown interview stage");
  let advance = false;
  let coveredCriteria = [...state.coveredCriteria];
  if (phase.transition === "initial") advance = progress.step !== "discussion";
  else if (phase.transition === "drawing")
    advance = progress.step === "review" && hasSketch(scene?.elements);
  else if (phase.transition === "coverage" && progress.step === "review") {
    coveredCriteria = [
      ...new Set([
        ...coveredCriteria,
        ...newlyCovered.filter(
          (index) =>
            Number.isInteger(index) &&
            index >= 0 &&
            index < phase.completionCriteria.length,
        ),
      ]),
    ].sort((a, b) => a - b);
    advance = coveredCriteria.length === phase.completionCriteria.length;
  }
  const next = advance
    ? { phaseIndex: state.phaseIndex + 1, coveredCriteria: [] }
    : { phaseIndex: state.phaseIndex, coveredCriteria };
  // Setup questions must never restart after the drawing stage has been reached.
  const step =
    next.phaseIndex > 0 && progress.step === "discussion"
      ? "drawing"
      : progress.step;
  return { state: next, progress: { ...progress, step } };
}
