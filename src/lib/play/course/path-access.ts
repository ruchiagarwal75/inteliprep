import { RAG_COURSE_NODES } from "./metadata";
/** Explicit course prerequisites, independent of path position and saved numbering. */
const prerequisites: Readonly<Record<number, number | null>> = {
  0: null,
  1: null,
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
