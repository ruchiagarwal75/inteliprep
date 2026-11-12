import { expect, it } from "vitest";
import { coursePassed, coursePassCount, courseStars } from "./rules";
it("passes at 75 percent rounded up for every supported question count", () => {
  for (const [total, needed] of [
    [6, 5],
    [7, 6],
    [8, 6],
  ]) {
    expect(coursePassCount(total)).toBe(needed);
    expect(
      coursePassed(Array.from({ length: total }, (_, i) => i < needed)),
    ).toBe(true);
    expect(
      coursePassed(Array.from({ length: total }, (_, i) => i < needed - 1)),
    ).toBe(false);
  }
  expect(coursePassed([true, true, true, true, true])).toBe(false);
});
it("awards one star for passing, two for all correct, three when no visible time exceeds 45 seconds", () => {
  const all = Array.from({ length: 7 }, () => ({
    correct: true,
    timeMs: 45000,
  }));
  expect(courseStars(all)).toBe(3);
  expect(courseStars([{ correct: true, timeMs: 45001 }, ...all.slice(1)])).toBe(
    2,
  );
  expect(courseStars([{ correct: false, timeMs: 1000 }, ...all.slice(1)])).toBe(
    1,
  );
  expect(
    courseStars([
      { correct: false, timeMs: 1000 },
      { correct: false, timeMs: 1000 },
      ...all.slice(2),
    ]),
  ).toBe(0);
});
