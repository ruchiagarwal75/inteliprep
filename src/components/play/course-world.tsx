import Link from "next/link";
import { courseProgress } from "@/lib/play/course/progress";
import type { PlayerSnapshot } from "@/lib/play/player";
import { RAG_COURSE_ID } from "@/lib/play/course/metadata";
import { WorldBanner } from "./world-banner";
import { CourseUnlock } from "./course-unlock";
import { CoursePath } from "./course-path";
import { StartRound } from "./start-round";
export function CourseWorld({
  snapshot,
  started = [],
  primerUnlock = false,
}: {
  snapshot: PlayerSnapshot;
  started?: number[];
  primerUnlock?: boolean;
}) {
  const levels = snapshot.levels.filter((row) => row.topic === RAG_COURSE_ID);
  const reviews =
    snapshot.reviews.find((row) => row.topic === RAG_COURSE_ID)?.count ?? 0;
  return (
    <>
      <Link className="practice-link" href="/play">
        All worlds
      </Link>
      <WorldBanner
        title="RAG"
        unit="topics"
        {...courseProgress(snapshot.levels)}
      />
      <p>All 10 RAG topics are open in this beta.</p>
      <Link className="practice-secondary" href="/play/rag/notebook">
        Notebook
      </Link>
      {reviews > 0 && (
        <section className="practice-surface">
          <h2>Review</h2>
          <p>{reviews} questions are due.</p>
          <StartRound
            topic={RAG_COURSE_ID}
            mode="review"
            label="Start review"
          />
        </section>
      )}
      <CourseUnlock armed={primerUnlock}>
        <CoursePath
          started={started}
          preserveTopicOne={levels.some(
            (row) => row.level === 1 && row.status !== "locked",
          )}
          passed={levels
            .filter((row) => row.status === "passed")
            .map((row) => row.level)}
          stars={Object.fromEntries(
            levels.map((row) => [row.level, row.best_stars]),
          )}
          chests={Object.fromEntries(
            snapshot.chests
              .filter((row) => row.topic === RAG_COURSE_ID)
              .map((row) => [row.after_level, row.xp]),
          )}
        />
      </CourseUnlock>
    </>
  );
}
