import "server-only";
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
  attempt: { id: string; ordinal: number; startedAt: string },
  total: number,
) {
  return drillQuestionSchema.parse({
    attemptId: attempt.id,
    drillId: drill.id,
    topic: drill.topic,
    level: drill.level,
    type: drill.type,
    title: drill.title,
    prompt:
      drill.type === "math"
        ? fillNumbers(drill.prompt, variant.parameters)
        : drill.prompt,
    ordinal: attempt.ordinal,
    total,
    startedAt: attempt.startedAt,
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
