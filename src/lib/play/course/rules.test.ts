import { expect, it } from "vitest";
import { coursePassed, coursePassCount, courseStars } from "./rules";
it("passes at 75 percent rounded up for every supported question count", () => {
  for (const [total, needed] of [
    [6, 5],
    [7, 6],
    [8, 6],
    [9, 7],
    [10, 8],
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
it("awards one star for passing, two for all correct, three within five minutes total", () => {
  const all = Array.from({ length: 7 }, () => ({
    correct: true,
    timeMs: 30000,
  }));
  expect(courseStars(all)).toBe(3);
  expect(
    courseStars([{ correct: true, timeMs: 120001 }, ...all.slice(1)]),
  ).toBe(2);
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

it("uses a whole-quiz time budget for ten-question quizzes", () => {
  const outcomes = (n: number, timeMs = 30000) =>
    Array.from({ length: 10 }, (_, i) => ({ correct: i < n, timeMs }));
  expect(courseStars(outcomes(7))).toBe(0);
  expect(courseStars(outcomes(8))).toBe(1);
  expect(courseStars(outcomes(9))).toBe(1);
  expect(courseStars(outcomes(10, 45000))).toBe(2);
  expect(courseStars(outcomes(10))).toBe(3);
});

it("allows a slower individual answer and includes the exact five-minute boundary", () => {
  for (const total of [6, 7, 8, 9, 10]) {
    const rest = Array.from({ length: total - 1 }, () => ({
      correct: true,
      timeMs: 10000,
    }));
    const first = { correct: true, timeMs: 300000 - rest.length * 10000 };
    expect(courseStars([first, ...rest])).toBe(3);
    expect(courseStars([{ ...first, timeMs: first.timeMs + 1 }, ...rest])).toBe(
      2,
    );
  }
});
