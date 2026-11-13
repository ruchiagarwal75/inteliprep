import "server-only";
import { courseQuestionSlide } from "./course/question-slides";
import { courseQuestionTitle } from "./course/titles";
import { randomInt } from "node:crypto";
import type { DrillDefinition, DrillVariant } from "./definition";
import { chooseParameters, fillNumbers } from "./math";
import { drillQuestionSchema } from "./public";
export function createVariant(drill: DrillDefinition): DrillVariant {
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    parameters: drill.type === "math" ? chooseParameters(drill.math) : {},
    order,
  };
}
export function publicQuestion(
  drill: DrillDefinition,
  variant: DrillVariant,
  attempt: {
    id: string;
    ordinal: number;
    startedAt: string;
    elapsedMs?: number;
    activityOrder?: number;
    maxTimeMs?: number;
    revision?: number;
  },
  total: number,
) {
  return drillQuestionSchema.parse({
    attemptId: attempt.id,
    drillId: drill.id,
    topic: drill.topic,
    level: drill.level,
    type: drill.type,
    courseKind: drill.type === "spot_flaw" ? drill.course?.kind : undefined,
    title: courseQuestionTitle(drill.id, drill.title),
    courseSlide:
      drill.type === "spot_flaw" && drill.course
        ? courseQuestionSlide(drill.id)
        : undefined,
    prompt:
      drill.type === "math"
        ? fillNumbers(drill.prompt, variant.parameters)
        : drill.prompt,
    ordinal: attempt.ordinal,
    total,
    startedAt: attempt.startedAt,
    elapsedMs: attempt.elapsedMs,
    activityOrder: attempt.activityOrder,
    maxTimeMs: attempt.maxTimeMs,
    revision: attempt.revision,
    serverNow: new Date().toISOString(),
    sample: drill.sample,
    ...(drill.gapId
      ? { gapHref: `/play/${drill.topic}/gaps/${drill.gapId}` }
      : {}),
    ...(drill.type === "spot_flaw"
      ? {
          options: variant.order.map((index, position) => ({
            id: String(position),
            text: drill.options[index],
          })),
        }
      : {}),
    ...(drill.type === "math"
      ? { units: drill.math.units.map(({ id, label }) => ({ id, label })) }
      : {}),
  });
}
