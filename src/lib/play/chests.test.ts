import { expect, it } from "vitest";
import { chestXp } from "./chests";
import { chestInputSchema } from "./public";
it("chooses a stable, bounded prize from the verified user and chest", () => {
  const prizes = Array.from({ length: 100 }, (_, i) =>
    chestXp(`owner-${i}`, "rag", 1),
  );
  expect(prizes.every((xp) => xp >= 20 && xp <= 50)).toBe(true);
  expect(new Set(prizes).size).toBeGreaterThan(10);
  expect(chestXp("owner", "rag", 1)).toBe(chestXp("owner", "rag", 1));
});
it("never accepts a caller's XP, seed, owner or open status", () => {
  for (const field of ["xp", "seed", "userId", "opened"])
    expect(
      chestInputSchema.safeParse({ topic: "rag", afterLevel: 1, [field]: 99 })
        .success,
    ).toBe(false);
});
