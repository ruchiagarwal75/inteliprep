import "server-only";
import type { ChatRequest } from "@/lib/chat";
import type { ProblemDefinition } from "@/lib/problems";
import { getInterviewProgress } from "@/lib/interview-progress";
import { acquireInterviewSession } from "@/lib/interview-sessions";
import { publicPhase } from "@/lib/phase-config";
import { assessPhaseCoverage } from "@/lib/phase-assessment";
import { planPhaseProgress } from "@/lib/phase-progress";

export async function prepareInterviewTurn(
  problem: ProblemDefinition,
  request: ChatRequest,
  signal: AbortSignal,
) {
  const progress = getInterviewProgress(
    problem,
    request.messages,
    request.scene,
    request.previousScene,
  );
  // Existing stateless API callers retain their current drawing-aware behavior.
  if (!request.sessionId)
    return {
      context: { problem, level: request.level, progress },
      phase: undefined,
      commit() {},
      release() {},
    };
  const lease = acquireInterviewSession(request.sessionId, request);
  try {
    const current = problem.phases[lease.state.phaseIndex];
    let covered: number[] = [];
    if (current.transition === "coverage" && progress.step === "review") {
      try {
        covered = await assessPhaseCoverage(current, request.messages, signal);
      } catch (cause) {
        if (signal.aborted) throw cause;
        console.warn(
          "[chat] Stage assessment unavailable; keeping the current stage.",
        );
      }
    }
    const plan = planPhaseProgress(
      problem,
      lease.state,
      progress,
      request.scene,
      covered,
    );
    return {
      context: {
        problem,
        level: request.level,
        progress: plan.progress,
        phase: problem.phases[plan.state.phaseIndex],
        coveredCriteria: plan.state.coveredCriteria,
      },
      phase: publicPhase(problem.phases, plan.state.phaseIndex),
      commit() {
        if (!signal.aborted) lease.commit(plan.state);
      },
      release: lease.release,
    };
  } catch (cause) {
    lease.release();
    throw cause;
  }
}
