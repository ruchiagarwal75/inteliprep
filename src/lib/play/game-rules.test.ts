import { expect, it } from "vitest";
import { GAME_RULES, levelStars, drillXp } from "./game-rules";
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
