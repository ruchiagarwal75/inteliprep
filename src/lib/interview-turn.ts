import "server-only";
import type { ChatRequest } from "@/lib/chat";
import type { ProblemDefinition } from "@/lib/problems";
import { getInterviewProgress } from "@/lib/interview-progress";
import {
  acquireInterviewSession,
  InterviewSessionError,
} from "@/lib/interview-sessions";
import { publicPhase } from "@/lib/phase-config";
import { assessPhaseCoverage } from "@/lib/phase-assessment";
import { planPhaseProgress } from "@/lib/phase-progress";
import {
  sharedRequirementCriteria,
  configuredClarification,
  isFactualQuestion,
} from "@/lib/configured-clarifications";
import { diagramReviewQuestion } from "@/lib/diagram-review";
import { hasCandidateAnswer } from "@/lib/grading-evidence";

export async function prepareInterviewTurn(
  problem: ProblemDefinition,
  request: ChatRequest,
  signal: AbortSignal,
) {
  const progress = getInterviewProgress(problem, request.messages);
  // Stateless callers retain the configured turn-count handoff and explicit pacing controls.
  if (!request.sessionId)
    return {
      context: { problem, level: request.level, progress },
      phase: undefined,
      commit() {},
      release() {},
    };
  const lease = acquireInterviewSession(
    request.sessionId,
    request,
    request.resumeToken,
  );
  try {
    const current = problem.phases[lease.state.phaseIndex];
    if (!current)
      throw new InterviewSessionError(
        "The saved interview uses an older stage configuration.",
        409,
      );
    let covered: number[] =
      current.transition === "initial"
        ? sharedRequirementCriteria(problem, request.level, request.messages)
        : [];
    const latest = request.messages.findLast(
      (message) => message.role === "user",
    );
    const clarification =
      latest && configuredClarification(problem, request.level, latest.content);
    const waiting = latest && !hasCandidateAnswer({ messages: [latest] });
    if (
      (current.transition === "initial" &&
        !clarification &&
        !waiting &&
        covered.length < current.completionCriteria.length) ||
      (current.transition === "coverage" && progress.step === "review")
    ) {
      try {
        covered = [
          ...covered,
          ...(await assessPhaseCoverage(current, request.messages, signal)),
        ];
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
        reviewQuestion:
          plan.progress.step === "review" &&
          problem.phases[plan.state.phaseIndex]?.transition !== "wrap-up" &&
          !isFactualQuestion(latest?.content ?? "")
            ? diagramReviewQuestion(request.scene, request.messages)
            : undefined,
      },
      phase: publicPhase(problem.phases, plan.state.phaseIndex),
      commit() {
        if (!signal.aborted) lease.commit(plan.state);
      },
      checkpoint: lease.checkpoint,
      release: lease.release,
    };
  } catch (cause) {
    lease.release();
    throw cause;
  }
}
