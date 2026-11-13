import Link from "next/link";
import type { PlayerSnapshot } from "@/lib/play/player";
import { RAG_COURSE_ID, RAG_COURSE_NODES } from "@/lib/play/course/metadata";
import { WorldBanner } from "./world-banner";
import { CoursePath } from "./course-path";
import { StartRound } from "./start-round";
export function CourseWorld({
  snapshot,
  started = [],
}: {
  snapshot: PlayerSnapshot;
  started?: number[];
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
        stars={levels.reduce((sum, row) => sum + row.best_stars, 0)}
        levelsPassed={levels.filter((row) => row.status === "passed").length}
        totalLevels={RAG_COURSE_NODES.length}
      />
      <p>
        Learn each topic, then check what you know. Topics 0 to 3 are open in
        this beta.
      </p>
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
      <CoursePath
        started={started}
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
    </>
  );
}
