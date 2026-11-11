import "server-only";
import { randomInt } from "node:crypto";
import type { DrillDefinition } from "./definition";
import { PlayError } from "./errors";
export const levelPassed = (results: boolean[]) =>
  results.length === 5 && results.filter(Boolean).length >= 4;
export function levelUnlocked(
  level: number,
  levels: readonly { level: number }[],
  passed: number[],
) {
  const index = levels.findIndex((row) => row.level === level);
  return (
    index >= 0 &&
    (index === 0 ||
      passed.includes(level) ||
      passed.includes(levels[index - 1].level))
  );
}
export function shuffled<T>(
  values: readonly T[],
  random = (max: number) => randomInt(max),
) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function chooseLevelDrills(bank: DrillDefinition[], level: number) {
  const drills = [
    ...new Map(
      bank.filter((d) => d.level === level).map((d) => [d.id, d]),
    ).values(),
  ];
  if (drills.length < 5)
    throw new PlayError(
      "This level needs more drills before it can open. Try Mock while we finish it.",
      503,
    );
  return shuffled(drills).slice(0, 5);
}
export function choosePlacementDrills(
  bank: DrillDefinition[],
  levels: readonly number[],
) {
  return levels.flatMap((level) => {
    const drills = bank.filter((d) => d.level === level),
      preferred = drills.filter((d) => d.placement);
    const chosen = preferred.length >= 2 ? preferred : drills;
    if (chosen.length < 2)
      throw new PlayError("Placement is not ready for this topic yet.", 503);
    return chosen.length === 2 ? chosen : shuffled(chosen).slice(0, 2);
  });
}
