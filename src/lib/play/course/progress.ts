import "server-only";
import type { PlayerSnapshot } from "../player";
import { RAG_COURSE_ID, RAG_COURSE_NODES } from "./metadata";
/** Count only this course's nodes. Retired worlds keep their separate history. */
export function courseProgress(rows: PlayerSnapshot["levels"]) {
  const levels = rows.filter(
    (row) =>
      row.topic === RAG_COURSE_ID &&
      RAG_COURSE_NODES.some((node) => node.level === row.level),
  );
  return {
    stars: levels.reduce((sum, row) => sum + row.best_stars, 0),
    levelsPassed: levels.filter((row) => row.status === "passed").length,
    totalLevels: RAG_COURSE_NODES.length,
  };
}
