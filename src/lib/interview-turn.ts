import "server-only";
import type { ChatRequest } from "@/lib/chat";
import type { ProblemDefinition } from "@/lib/problems";
import {
  getInterviewProgress,
  isListeningContinuation,
} from "@/lib/interview-progress";
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
import { logServerEvent } from "@/lib/server-events";

export async function prepareInterviewTurn(
  problem: ProblemDefinition,
  request: ChatRequest,
  signal: AbortSignal,
) {
  const progress = getInterviewProgress(problem, request.messages);
  // Stateless callers retain the configured turn-count handoff and explicit pacing controls.
  if (!request.sessionId)
    return {
      context: {
        problem,
        level: request.level,
        progress,
        listening: isListeningContinuation(
          problem,
          request.messages,
          progress.step,
        ),
      },
      phase: undefined,
      completedPhase: () => undefined,
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
        logServerEvent(
          { event: "stage_assessment_failure", route: "/api/chat" },
          cause,
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
    let completedPlan = plan;
    return {
      context: {
        problem,
        level: request.level,
        progress: plan.progress,
        phase: problem.phases[plan.state.phaseIndex],
        coveredCriteria: plan.state.coveredCriteria,
        listening: isListeningContinuation(
          problem,
          request.messages,
          plan.progress.step,
        ),
        reviewQuestion:
          plan.progress.step === "review" &&
          problem.phases[plan.state.phaseIndex]?.transition !== "wrap-up" &&
          !isFactualQuestion(latest?.content ?? "")
            ? diagramReviewQuestion(request.scene, request.messages)
            : undefined,
      },
      phase: publicPhase(problem.phases, plan.state.phaseIndex),
      completedPhase: () =>
        publicPhase(problem.phases, completedPlan.state.phaseIndex),
      commit(reply: string) {
        if (signal.aborted) return;
        // Facts supplied in this very reply cannot become a repeated setup question.
        if (current.transition === "initial")
          completedPlan = planPhaseProgress(
            problem,
            lease.state,
            progress,
            request.scene,
            [
              ...covered,
              ...sharedRequirementCriteria(problem, request.level, [
                ...request.messages,
                { role: "assistant", content: reply },
              ]),
            ],
          );
        lease.commit(completedPlan.state);
      },
      checkpoint: lease.checkpoint,
      release: lease.release,
    };
  } catch (cause) {
    lease.release();
    throw cause;
  }
}
