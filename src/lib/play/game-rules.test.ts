import { expect, it } from "vitest";
import { GAME_RULES, levelStars, drillXp, playerXpLevel } from "./game-rules";
const five = () =>
  Array.from({ length: 5 }, () => ({
    correct: true,
    type: "math" as const,
    timeMs: 90000,
  }));
it("requires five answers and awards one, two or three stars using saved par times", () => {
  expect(levelStars(five())).toBe(3);
  expect(
    levelStars(five().map((r, i) => ({ ...r, timeMs: i === 0 ? 90001 : 100 }))),
  ).toBe(2);
  expect(levelStars(five().map((r, i) => ({ ...r, correct: i !== 0 })))).toBe(
    1,
  );
  expect(levelStars(five().map((r, i) => ({ ...r, correct: i > 1 })))).toBe(0);
  expect(levelStars(five().slice(0, 2))).toBe(0);
});
it("uses the configured par for each type, with no client timing involved", () => {
  for (const type of ["math", "spot_flaw", "tradeoff", "pick_probe"] as const) {
    expect(
      levelStars(
        five().map((r) => ({ ...r, type, timeMs: GAME_RULES.parMs[type] })),
      ),
    ).toBe(3);
    expect(
      levelStars(
        five().map((r) => ({ ...r, type, timeMs: GAME_RULES.parMs[type] + 1 })),
      ),
    ).toBe(2);
  }
});
it("halves replay drill XP and never creates fractional ledger entries", () => {
  expect(drillXp(10, false)).toBe(10);
  expect(drillXp(10, true)).toBe(5);
  expect(drillXp(15, true)).toBe(7);
  expect(drillXp(20, true)).toBe(10);
});

it("derives the increasing player level curve without a second XP balance", () => {
  expect(playerXpLevel(0)).toEqual({
    level: 1,
    currentXp: 0,
    neededXp: 100,
    nextXp: 100,
  });
  expect(playerXpLevel(99).level).toBe(1);
  expect(playerXpLevel(100).level).toBe(2);
  expect(playerXpLevel(299).level).toBe(2);
  expect(playerXpLevel(300).level).toBe(3);
  expect(playerXpLevel(600)).toEqual({
    level: 4,
    currentXp: 0,
    neededXp: 400,
    nextXp: 1000,
  });
  expect(playerXpLevel(9999).level).toBe(14);
});
