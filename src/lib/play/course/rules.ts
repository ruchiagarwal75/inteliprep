import "server-only";
import { COURSE_THREE_STAR_MS } from "./metadata";
export const coursePassCount = (total: number) => Math.ceil(total * 0.75);
export function coursePassed(results: boolean[]) {
  return (
    results.length >= 6 &&
    results.length <= 10 &&
    results.filter(Boolean).length >= coursePassCount(results.length)
  );
}
export function courseStars(results: { correct: boolean; timeMs: number }[]) {
  if (!coursePassed(results.map((row) => row.correct))) return 0;
  if (results.some((row) => !row.correct)) return 1;
  return results.reduce((sum, row) => sum + row.timeMs, 0) <=
    COURSE_THREE_STAR_MS
    ? 3
    : 2;
}
