import { courseProgress } from "@/lib/play/course/progress";
import type { PlayerSnapshot } from "@/lib/play/player";
import { RAG_COURSE_ID } from "@/lib/play/course/metadata";
import type { RagBossState } from "@/lib/rag-boss-public";
import { CourseWorldView } from "./course-world-view";
export function CourseWorld({
  snapshot,
  boss,
  started = [],
  primerUnlock = false,
  view = "path",
}: {
  snapshot: PlayerSnapshot;
  boss: RagBossState;
  started?: number[];
  primerUnlock?: boolean;
  view?: "map" | "path";
}) {
  const levels = snapshot.levels.filter((row) => row.topic === RAG_COURSE_ID);
  const reviews =
    snapshot.reviews.find((row) => row.topic === RAG_COURSE_ID)?.count ?? 0;
  const pathProps = {
    started,
    preserveTopicOne: levels.some(
      (row) => row.level === 1 && row.status !== "locked",
    ),
    passed: levels
      .filter((row) => row.status === "passed")
      .map((row) => row.level),
    stars: Object.fromEntries(levels.map((row) => [row.level, row.best_stars])),
    chests: Object.fromEntries(
      snapshot.chests
        .filter((row) => row.topic === RAG_COURSE_ID)
        .map((row) => [row.after_level, row.xp]),
    ),
  };

  return (
    <CourseWorldView
      progress={courseProgress(snapshot.levels)}
      pathProps={pathProps}
      reviews={reviews}
      boss={boss}
      primerUnlock={primerUnlock}
      view={view}
    />
  );
}
