import { describe, expect, it } from "vitest";
import { planPhaseProgress } from "@/lib/phase-progress";
import type { InterviewProgress } from "@/lib/interview-progress";
import { getProblem } from "@/lib/problems";
import { sceneSchema } from "@/lib/scene";
import basicScene from "@/lib/fixtures/basic-system.json";

const selected = getProblem("single-server-scaling");
if (!selected) throw new Error("Missing config");
const problem = selected;
const scene = sceneSchema.parse(basicScene);
const progress = (step: InterviewProgress["step"]): InterviewProgress => ({
  step,
  candidateTurns: 2,
  discussionTurnLimit: 2,
});
const state = (phaseIndex: number, coveredCriteria: number[] = []) => ({
  phaseIndex,
  coveredCriteria,
});

describe("stage progression separate from candidate pacing", () => {
  it("moves from setup to drawing at handoff or early drawing without skipping to review", () => {
    expect(
      planPhaseProgress(problem, state(0), progress("discussion"), scene).state
        .phaseIndex,
    ).toBe(0);
    for (const step of [
      "invite-drawing",
      "drawing",
      "explaining",
      "review",
    ] as const)
      expect(
        planPhaseProgress(problem, state(0), progress(step), scene).state
          .phaseIndex,
      ).toBe(1);
  });
  it("requires explicit discussion permission and a sketch before leaving drawing", () => {
    for (const step of ["drawing", "explaining"] as const)
      expect(
        planPhaseProgress(problem, state(1), progress(step), scene).state
          .phaseIndex,
      ).toBe(1);
    expect(
      planPhaseProgress(problem, state(1), progress("review"), { elements: [] })
        .state.phaseIndex,
    ).toBe(1);
    expect(
      planPhaseProgress(problem, state(1), progress("review"), scene).state
        .phaseIndex,
    ).toBe(2);
  });
  it("collects criterion coverage across turns, then advances exactly one stage", () => {
    const first = planPhaseProgress(
      problem,
      state(2),
      progress("review"),
      scene,
      [0],
    );
    expect(first.state).toEqual(state(2, [0]));
    const second = planPhaseProgress(
      problem,
      first.state,
      progress("review"),
      scene,
      [1, 1, -1, 10],
    );
    expect(second.state).toEqual(state(3));
    expect(second.progress.step).toBe("review");
  });
  it.each(["drawing", "explaining"] as const)(
    "keeps the stage and existing coverage unchanged during %s",
    (step) => {
      const plan = planPhaseProgress(
        problem,
        state(3, [0]),
        progress(step),
        scene,
        [1],
      );
      expect(plan.state).toEqual(state(3, [0]));
      expect(plan.progress.step).toBe(step);
    },
  );
  it("never restarts setup after drawing and never advances past wrap-up", () => {
    expect(
      planPhaseProgress(problem, state(3), progress("discussion"), scene)
        .progress.step,
    ).toBe("drawing");
    expect(
      planPhaseProgress(problem, state(4), progress("review"), scene, [0]).state
        .phaseIndex,
    ).toBe(4);
  });
});
