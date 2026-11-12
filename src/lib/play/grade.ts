import "server-only";
import type { DrillDefinition, DrillVariant } from "./definition";
import type { DrillAnswer } from "./public";
import { calculateMath, withinMathTolerance } from "./math";
import {
  friendlyMathAnswer,
  workedMath,
  mathExplanation,
} from "./math-presentation";
import { gradeWrittenAnswer } from "./written-grader";
export type DrillGrade = {
  correct: boolean;
  score: number;
  feedback: string;
  why: string;
  formula?: string;
  expected?: string;
};
export async function gradeDrill(
  drill: DrillDefinition,
  variant: DrillVariant,
  answer: DrillAnswer,
  signal?: AbortSignal,
): Promise<DrillGrade> {
  if (drill.type !== answer.type)
    throw Error("Answer type does not match drill");
  if (drill.type === "math" && answer.type === "math") {
    const unit = drill.math.units.find((unit) => unit.id === answer.unit);
    if (!unit) throw Error("Choose a unit from the list");
    const expected = calculateMath(drill.math, variant.parameters),
      correct = withinMathTolerance(
        answer.value * unit.factor,
        expected,
        drill.math.exactInteger,
      );
    const display = friendlyMathAnswer(
      expected,
      drill.math.canonicalUnit,
      drill.math.exactInteger,
    );
    return {
      correct,
      score: correct ? 1 : 0,
      feedback: correct
        ? "That calculation checks out."
        : "Check the units and work through the formula.",
      why: mathExplanation(drill.why, variant.parameters),
      formula: workedMath(drill.math, variant.parameters, display),
      expected: display,
    };
  }
  if (drill.type === "spot_flaw" && answer.type === "spot_flaw") {
    const correct = variant.order[Number(answer.option)] === drill.correctIndex;
    return {
      correct,
      score: correct ? 1 : 0,
      feedback: correct
        ? "You found the flaw."
        : "That does not address the main flaw.",
      why: drill.why,
      expected: drill.options[drill.correctIndex],
    };
  }
  if (
    (drill.type === "pick_probe" && answer.type === "pick_probe") ||
    (drill.type === "tradeoff" && answer.type === "tradeoff")
  )
    return gradeWrittenAnswer(drill, answer, signal);
  throw Error("Answer type does not match drill");
}
