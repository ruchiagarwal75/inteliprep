import { sceneToGraph } from "@/lib/scene-graph";
import { resumePendingQuestion } from "@/lib/pending-question-reply";
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
import {
  addedComponentQuestion,
  diagramConsistencyQuestion,
  whiteboardVisibilityReply,
} from "@/lib/diagram-consistency";
import {
  questionAtEnd,
  hasExplanation,
  invitesDrawing,
} from "@/lib/open-question";
import { diagramReviewQuestion } from "@/lib/diagram-review";
import { hasCandidateAnswer } from "@/lib/grading-evidence";
import { logServerEvent } from "@/lib/server-events";
import { isRequirementProposal } from "@/lib/candidate-proposal";
import { requestedReviewTopic } from "@/lib/review-probes";
import { isOffTopicRequest } from "@/lib/off-topic";
import { questionMemory } from "@/lib/question-memory";
import type { InterviewContext } from "@/lib/interview-instructions";
import { pendingDiagramComponents } from "@/lib/pending-diagram-components";
import { stageTopicCounts } from "@/lib/probe-topics";
import { modelSettings } from "@/lib/model-settings";
import { withoutQuestions } from "@/lib/drawing-reply";
import { stageTimeGate } from "@/lib/stage-clock";

export async function prepareInterviewTurn(
  problem: ProblemDefinition,
  request: ChatRequest,
  signal: AbortSignal,
) {
  const progress = getInterviewProgress(problem, request.messages);
  // Stateless callers retain the configured turn-count handoff and explicit pacing controls.
  if (!request.sessionId) {
    const context: InterviewContext & { progress: typeof progress } = {
      problem,
      designText:
        request.messages
          .filter(
            (message) =>
              message.role === "user" &&
              message.source !== "control" &&
              !/[?？]/u.test(message.content),
          )
          .map((message) => message.content)
          .join("\n") +
        "\n" +
        sceneToGraph(request.scene)
          .components.map((node) => node.label)
          .join("\n"),
      diagramLabels: sceneToGraph(request.scene).components.map(
        (node) => node.label,
      ),
      level: request.level,
      progress,
      listening: isListeningContinuation(
        problem,
        request.messages,
        progress.step,
      ),
    };
    return {
      context,
      phase: undefined,
      completedPhase: () => undefined,
      commit() {},
      release() {},
    };
  }
  const lease = acquireInterviewSession(
    request.sessionId,
    request,
    request.resumeToken,
  );
  try {
    const modern = /^gpt-6\.1-(?:sol|terra)(?:-|$)/u.test(
      modelSettings("reply").model,
    );
    const current = problem.phases[lease.state.phaseIndex];
    if (!current)
      throw new InterviewSessionError(
        "The saved interview uses an older stage configuration.",
        409,
        false,
        "INTERVIEW_CONFIGURATION_CHANGED",
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
    const offTopic =
      latest?.source !== "control" &&
      isOffTopicRequest(latest?.content ?? "", problem.track === "genai");
    const waiting = latest && !hasCandidateAnswer({ messages: [latest] });
    if (
      !offTopic &&
      ((current.transition === "initial" &&
        !clarification &&
        !waiting &&
        covered.length < current.completionCriteria.length) ||
        (current.transition === "coverage" &&
          progress.step === "review" &&
          (lease.clock.timing.durationMinutes === 1 ||
            (!waiting &&
              !isFactualQuestion(latest?.content ?? "") &&
              stageTimeGate(lease.state.phaseIndex, true, lease.clock)
                .advance))))
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
    let plan = offTopic
      ? { state: lease.state, progress }
      : planPhaseProgress(
          problem,
          lease.state,
          progress,
          request.scene,
          covered,
          lease.clock,
        );
    const nextPhase = problem.phases[plan.state.phaseIndex];
    // Seed a newly entered stage from explanations already given; advance at most once.
    if (
      plan.state.phaseIndex > lease.state.phaseIndex &&
      nextPhase.transition === "coverage" &&
      current.transition !== "coverage"
    ) {
      try {
        plan = {
          ...plan,
          state: {
            ...plan.state,
            coveredCriteria: await assessPhaseCoverage(
              nextPhase,
              request.messages,
              signal,
            ),
          },
        };
      } catch (cause) {
        if (signal.aborted) throw cause;
        logServerEvent(
          { event: "stage_assessment_failure", route: "/api/chat" },
          cause,
        );
      }
    }
    const paused =
      plan.progress.step === "drawing" || plan.progress.step === "explaining";
    let answeredPendingQuestion = false;
    if (
      !modern &&
      lease.openQuestion &&
      lease.state.phaseIndex >= 2 &&
      !offTopic &&
      ((paused && !waiting) ||
        (latest?.action === "review" && hasExplanation(request.messages)))
    ) {
      try {
        answeredPendingQuestion = (
          await assessPhaseCoverage(
            {
              ...current,
              transition: "coverage",
              goal: "Resolve the pending interviewer question using candidate evidence only.",
              completionCriteria: [
                `The candidate answers this question with a concrete relevant explanation: ${lease.openQuestion}`,
              ],
              clarificationQuestions: undefined,
            },
            request.messages,
            signal,
          )
        ).includes(0);
      } catch (cause) {
        if (signal.aborted) throw cause;
        logServerEvent(
          { event: "stage_assessment_failure", route: "/api/chat" },
          cause,
        );
      }
    }
    const resumedQuestion =
      latest?.action === "review" && !answeredPendingQuestion
        ? lease.openQuestion
        : undefined;
    let completedPlan = plan;
    const memory = questionMemory(request.messages, [
      ...lease.coveredTopics,
      ...plan.state.coveredCriteria.map((i) => nextPhase.completionCriteria[i]),
    ]);
    const diagramComponents = pendingDiagramComponents(
      lease.pendingDiagramComponents,
      request.scene,
      request.previousScene,
    );
    const visibility = whiteboardVisibilityReply(
      request.scene,
      latest?.content ?? "",
    );
    const mismatch = !paused
      ? diagramConsistencyQuestion(request.scene, request.messages)
      : undefined;
    const context: InterviewContext & { progress: typeof progress } = {
      problem,
      designText:
        request.messages
          .filter(
            (message) =>
              message.role === "user" &&
              message.source !== "control" &&
              !/[?？]/u.test(message.content),
          )
          .map((message) => message.content)
          .join("\n") +
        "\n" +
        sceneToGraph(request.scene)
          .components.map((node) => node.label)
          .join("\n"),
      diagramLabels: sceneToGraph(request.scene).components.map(
        (node) => node.label,
      ),
      level: request.level,
      mayInviteDrawing:
        plan.state.phaseIndex > 0 || lease.clock.timing.durationMinutes === 1,
      progress: plan.progress,
      phase: problem.phases[plan.state.phaseIndex],
      coveredCriteria: plan.state.coveredCriteria,
      questionMemory: {
        ...memory,
        topicTurns: stageTopicCounts(lease.topicTurnCounts, nextPhase.id),
      },
      openQuestions: lease.openQuestions,
      diagramQuestion: modern ? mismatch : undefined,
      answeredQuestionIds: [],
      continuedQuestionId:
        visibility && !paused ? lease.openQuestions[0]?.id : undefined,
      diagramUpdates:
        !paused && latest?.action === "review" ? diagramComponents : [],
      listening: isListeningContinuation(
        problem,
        request.messages,
        plan.progress.step,
      ),
      reviewQuestion:
        (visibility
          ? paused || !lease.openQuestions[0]
            ? visibility
            : `${withoutQuestions(visibility).trim()}\n\n${resumePendingQuestion(lease.openQuestions[0], request.messages)}`
          : undefined) ??
        (!modern ? mismatch : undefined) ??
        (!modern && resumedQuestion
          ? `Returning to the question we paused: ${resumedQuestion}`
          : undefined) ??
        (!lease.openQuestions.length &&
        !mismatch &&
        plan.progress.step === "review" &&
        problem.phases[plan.state.phaseIndex]?.transition !== "wrap-up" &&
        !isRequirementProposal(latest?.content ?? "") &&
        !isFactualQuestion(latest?.content ?? "") &&
        !requestedReviewTopic(request.messages) &&
        !offTopic &&
        (latest?.source === "control" || latest?.action === "review")
          ? diagramReviewQuestion(
              request.scene,
              request.messages,
              problem.diagramReview.checkApplicationDataPaths,
              problem.track,
            )
          : undefined) ??
        (!lease.openQuestions.length &&
        !mismatch &&
        plan.progress.step === "review"
          ? addedComponentQuestion(
              request.scene,
              request.previousScene,
              request.messages,
            )
          : undefined),
      explanationMissing:
        latest?.action === "review" && !hasExplanation(request.messages),
    };
    return {
      context,
      phase: publicPhase(problem.phases, plan.state.phaseIndex),
      completedPhase: () =>
        publicPhase(problem.phases, completedPlan.state.phaseIndex),
      commit(reply: string) {
        if (signal.aborted) return;
        // Facts supplied in this very reply cannot become a repeated setup question.
        if (!offTopic && current.transition === "initial")
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
            lease.clock,
          );
        if (completedPlan.state.phaseIndex === 0 && invitesDrawing(reply))
          completedPlan = {
            ...completedPlan,
            state: { phaseIndex: 1, coveredCriteria: [] },
          };
        if (
          context.advancedPhaseIndex === plan.state.phaseIndex + 1 &&
          plan.state.phaseIndex >= 2
        )
          completedPlan = {
            ...completedPlan,
            state: {
              phaseIndex: context.advancedPhaseIndex,
              coveredCriteria: [],
            },
          };
        lease.recordReply(
          reply,
          !offTopic && !waiting && latest?.source !== "control",
          paused,
          questionAtEnd(reply),
          answeredPendingQuestion ||
            (lease.state.phaseIndex === 0 &&
              completedPlan.state.phaseIndex > 0),
          {
            // Retiring an exhausted question does not mark its rubric area covered.
            resolvedQuestionIds: [
              ...(context.answeredQuestionIds ?? []),
              ...(context.retiredQuestionIds ?? []),
            ],
            continuedQuestionId: context.continuedQuestionId,
            topicId: context.selectedTopic,
            stageId: context.phase?.id ?? nextPhase.id,
            diagramComponents:
              context.diagramUpdates?.length && !paused
                ? []
                : diagramComponents,
            resetQuestions:
              lease.state.phaseIndex === 0 &&
              completedPlan.state.phaseIndex > 0,
          },
        );
        lease.commit(completedPlan.state, [
          ...memory.coveredTopics,
          ...[...covered, ...lease.state.coveredCriteria]
            .map((i) => current.completionCriteria[i])
            .filter((topic): topic is string => Boolean(topic)),
        ]);
      },
      checkpoint: lease.checkpoint,
      release: lease.release,
    };
  } catch (cause) {
    lease.release();
    throw cause;
  }
}
