import { expect, it } from "vitest";
import {
  levelPassed,
  levelUnlocked,
  chooseLevelDrills,
  choosePlacementDrills,
} from "./round-rules";
import { mathFixture } from "./fixtures/drills";
const levels = [{ level: 1 }, { level: 2 }, { level: 3 }, { level: 4 }];
it("requires exactly five completed drills and at least four correct", () => {
  expect(levelPassed([true, true, true, true, false])).toBe(true);
  expect(levelPassed([true, true, true, true, true])).toBe(true);
  expect(levelPassed([true, true, true, false, false])).toBe(false);
  expect(levelPassed([true, true, true, true])).toBe(false);
  expect(levelPassed([true, true, true, true, true, true])).toBe(false);
});
it("opens only the first, already-passed, or next level", () => {
  expect(levelUnlocked(1, levels, [])).toBe(true);
  expect(levelUnlocked(2, levels, [])).toBe(false);
  expect(levelUnlocked(2, levels, [1])).toBe(true);
  expect(levelUnlocked(3, levels, [1])).toBe(false);
  expect(levelUnlocked(4, levels, [3])).toBe(true);
  expect(levelUnlocked(99, levels, [1, 2, 3, 4])).toBe(false);
});
it("draws five distinct IDs and places two drills from each configured level", () => {
  const bank = levels.flatMap((l) =>
    Array.from({ length: 8 }, (_, i) => ({
      ...mathFixture,
      id: `sample-${l.level}-${i}`,
      level: l.level,
      placement: i < 2,
    })),
  );
  for (let i = 0; i < 10; i++) {
    const selected = chooseLevelDrills(bank, 2);
    expect(selected).toHaveLength(5);
    expect(new Set(selected.map((d) => d.id)).size).toBe(5);
    expect(selected.every((d) => d.level === 2)).toBe(true);
  }
  expect(choosePlacementDrills(bank, [1, 2, 3]).map((d) => d.level)).toEqual([
    1, 1, 2, 2, 3, 3,
  ]);
  expect(() => chooseLevelDrills(bank.slice(0, 2), 1)).toThrow("more drills");
});
