import { RAG_COURSE_NODES } from "./metadata";
/** Explicit course prerequisites, independent of path position and saved numbering. */
const prerequisites: Readonly<Record<number, number | null>> = {
  0: null,
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
  8: 7,
  9: 8,
};
export function courseLevelOpen(
  level: number,
  passed: readonly number[],
  started: readonly number[] = [],
) {
  const prerequisite = prerequisites[level];
  return (
    RAG_COURSE_NODES.some((node) => node.level === level && node.available) &&
    (prerequisite === null ||
      passed.includes(level) ||
      started.includes(level) ||
      (prerequisite !== undefined && passed.includes(prerequisite)))
  );
}

export function primerOptional(
  passed: readonly number[],
  started: readonly number[],
) {
  return (
    !passed.includes(0) && [...passed, ...started].some((level) => level > 0)
  );
}
export function nextCourseLevel(
  passed: readonly number[],
  started: readonly number[] = [],
) {
  return RAG_COURSE_NODES.find(
    (node) =>
      !(node.level === 0 && primerOptional(passed, started)) &&
      !passed.includes(node.level) &&
      courseLevelOpen(node.level, passed, started),
  );
}
