import "server-only";
import type { DrillQuestion } from "./public";
export const GAME_RULES = {
  parMs: {
    spot_flaw: 45000,
    math: 90000,
    pick_probe: 120000,
    tradeoff: 120000,
  },
  xpPerPlayerLevel: 100,
} as const;
export type TimedOutcome = {
  correct: boolean;
  type: DrillQuestion["type"];
  timeMs: number;
};
export function levelStars(outcomes: TimedOutcome[]) {
  if (outcomes.length !== 5) return 0;
  const correct = outcomes.filter((row) => row.correct).length;
  if (correct < 4) return 0;
  if (correct === 4) return 1;
  return outcomes.every((row) => row.timeMs <= GAME_RULES.parMs[row.type])
    ? 3
    : 2;
}
/** XP is integral in the existing ledger. Replays round down per drill. */
export const drillXp = (normal: number, replay: boolean) =>
  replay ? Math.floor(normal / 2) : normal;

/** Level n costs 100*n XP to advance. Total XP remains the ledger sum. */
export function playerXpLevel(total: number) {
  const level = Math.floor(
    (1 + Math.sqrt(1 + (8 * total) / GAME_RULES.xpPerPlayerLevel)) / 2,
  );
  const startXp = (GAME_RULES.xpPerPlayerLevel * level * (level - 1)) / 2;
  const nextXp = (GAME_RULES.xpPerPlayerLevel * level * (level + 1)) / 2;
  return {
    level,
    currentXp: total - startXp,
    neededXp: nextXp - startXp,
    nextXp,
  };
}

export function nextCombo(current: number, correct: boolean) {
  const combo = correct ? current + 1 : 0;
  return { combo, bonus: combo === 3 ? 5 : combo === 5 ? 10 : 0 };
}
